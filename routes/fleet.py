from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import random
from database import get_db_connection

fleet_bp = Blueprint('fleet', __name__)

@fleet_bp.route('/api/fleet')
@login_required
def api_fleet():
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT * FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet:
            conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (current_user.id, 'Nexus Fleet Alpha'))
            conn.commit()
            fleet = conn.execute('SELECT * FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        
        vehicles = [dict(v) for v in conn.execute('SELECT * FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchall()]
        sessions_raw = conn.execute('SELECT cs.*, fv.vehicle_name, s.name as station_name FROM charging_sessions cs JOIN fleet_vehicles fv ON cs.vehicle_id = fv.id JOIN stations s ON cs.station_id = s.id WHERE fv.fleet_id = ? ORDER BY cs.start_time DESC LIMIT 15', (fleet['id'],)).fetchall()
        totals = conn.execute('SELECT SUM(total_kwh), SUM(total_spend), AVG(battery_pct) FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchone()
        
        return jsonify({
            'fleet': dict(fleet), 
            'fleet_vehicles': vehicles,
            'fleet_sessions': [dict(s) for s in sessions_raw],
            'fleet_kwh': round(totals[0] or 0, 1), 
            'fleet_spend': round(totals[1] or 0, 2),
            'avg_battery': round(totals[2] or 0, 1), 
            'health_score': 98
        })
    finally: conn.close()

@fleet_bp.route('/api/vehicle/lookup', methods=['POST'])
@login_required
def api_vehicle_lookup():
    plate = (request.json or {}).get('plate_number', '').strip().upper()
    if not plate: return jsonify({'status': 'error', 'message': 'Plate number required'}), 400
    
    registry = {
        'GJ-01-TX-0001': {'name': 'Tesla Model 3', 'model': 'Long Range', 'cap': 82},
        'GJ-01-AX-9999': {'name': 'Audi e-tron GT', 'model': 'Quattro', 'cap': 93},
        'MH-01-EQ-7777': {'name': 'Mercedes-Benz EQS', 'model': '580 4Matic', 'cap': 107}
    }
    data = registry.get(plate) or {'name': 'Identified EV', 'model': 'Generic Class-A', 'cap': 55}
        
    return jsonify({
        'status': 'success',
        'data': {
            'vehicle_name': data['name'],
            'vehicle_model': data['model'],
            'plate': plate,
            'battery_capacity': data['cap']
        }
    })

@fleet_bp.route('/fleet/add', methods=['POST'])
@login_required
def fleet_add():
    data = request.json or {}
    name, plate = data.get('vehicle_name'), data.get('vehicle_number')
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        fleet_id = fleet['id'] if fleet else conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (current_user.id, f"{current_user.name}'s Fleet")).lastrowid
        
        conn.execute('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, total_kwh, total_spend, status, battery_pct, lat, lng) VALUES (?,?,?,?,?,?,?,?,?)',
                     (fleet_id, name, plate, 0, 0, 'idle', random.randint(30, 95), 23.0225, 72.5714))
        conn.commit()
        return jsonify({'success': True})
    finally: conn.close()
