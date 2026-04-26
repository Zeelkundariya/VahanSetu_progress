from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from database import get_db_connection

user_bp = Blueprint('user', __name__)

@user_bp.route('/api/profile_data')
@login_required
def api_profile_data():
    conn = get_db_connection()
    try:
        history = [dict(r) for r in conn.execute('SELECT cs.*, s.name as station_name, s.address FROM charging_sessions cs JOIN stations s ON cs.station_id = s.id ORDER BY cs.start_time DESC LIMIT 15').fetchall()]
        stats = conn.execute('SELECT COUNT(*) as s, SUM(energy_kwh) as e, SUM(cost) as r FROM charging_sessions cs JOIN fleet_vehicles fv ON cs.vehicle_id = fv.id JOIN fleets f ON fv.fleet_id = f.id WHERE f.user_id = ?', (current_user.id,)).fetchone()
        return jsonify({
            'stats': {
                'total_sessions': stats['s'] or 0,
                'total_kwh': round(stats['e'] or 0, 1),
                'total_spend': round(stats['r'] or 0, 0),
                'co2_saved': round((stats['e'] or 0) * 0.4, 1)
            }, 
            'history': history
        })
    finally: conn.close()

@user_bp.route('/api/notifications')
@login_required
def api_notifications():
    conn = get_db_connection()
    try:
        notes = [dict(n) for n in conn.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10', (current_user.id,)).fetchall()]
        unread = conn.execute('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0', (current_user.id,)).fetchone()[0]
        return jsonify({'notifications': notes, 'unread': unread})
    finally: conn.close()
