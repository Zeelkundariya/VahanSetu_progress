from flask import Blueprint, request, jsonify
from flask_login import login_required
import requests
import random
import concurrent.futures
from utils import haversine

trip_bp = Blueprint('trip', __name__)

def geocode_location(q):
    if not q or q.lower() == 'my location': return None
    try:
        r = requests.get(f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1", 
                         headers={'User-Agent': 'VahanSetu-App-2026'}, timeout=6)
        d = r.json()
        if d: return {"lat": float(d[0]['lat']), "lng": float(d[0]['lon']), "name": d[0]['display_name']}
    except: pass
    return None

@trip_bp.route('/api/trip_plan')
@login_required
def trip_plan():
    start_q, end_q = request.args.get('start'), request.args.get('end')
    user_lat, user_lng = request.args.get('lat', type=float), request.args.get('lng', type=float)

    start_node = geocode_location(start_q) or {"lat": user_lat, "lng": user_lng, "name": "Current Position"}
    end_node = geocode_location(end_q)
    
    if not start_node or not end_node or start_node['lat'] is None or end_node['lat'] is None:
        return jsonify({"error": "Geocode failed."}), 400

    try:
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_node['lng']},{start_node['lat']};{end_node['lng']},{end_node['lat']}?overview=full&geometries=geojson&steps=true"
        r = requests.get(osrm_url, timeout=10).json()
        if r.get('code') != 'Ok': return jsonify({"error": "No route found."}), 404
            
        route = r['routes'][0]
        geometry = route['geometry']
        total_km = round((route['distance'] / 1000) * 1.016, 1)
        
        # Simple stop discovery for the blueprint demo
        stops = [] # Real logic would call fetch_corridor_hubs from app.py
        
        return jsonify({
            "geometry": geometry,
            "total_km": total_km,
            "total_time": f"{int(route['duration']/60)} mins",
            "instructions": [], # Simplified for now
            "stops": []
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
