from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from database import get_db_connection
from utils import haversine

stations_bp = Blueprint('stations', __name__)

@stations_bp.route('/api/stations')
@login_required
def get_stations():
    lat = request.args.get('lat', type=float, default=23.0225)
    lng = request.args.get('lng', type=float, default=72.5714)
    
    conn = get_db_connection()
    db_stations = [dict(s) for s in conn.execute('SELECT * FROM stations').fetchall()]
    conn.close()
    
    for s in db_stations:
        s['distance_km'] = haversine(lat, lng, s['lat'], s['lng'])
        s['is_verified_db'] = True

    sorted_stations = sorted(db_stations, key=lambda x: x['distance_km'])
    return jsonify(sorted_stations)

@stations_bp.route('/api/favorite/<int:station_id>', methods=['POST'])
@login_required
def toggle_favorite(station_id):
    conn = get_db_connection()
    fav = conn.execute('SELECT id FROM favorites WHERE user_id = ? AND station_id = ?', (current_user.id, station_id)).fetchone()
    if fav:
        conn.execute('DELETE FROM favorites WHERE id = ?', (fav['id'],))
        msg = "Removed from favorites"
    else:
        conn.execute('INSERT INTO favorites (user_id, station_id) VALUES (?, ?)', (current_user.id, station_id))
        msg = "Added to favorites"
    conn.commit(); conn.close()
    return jsonify({'success': True, 'message': msg})
