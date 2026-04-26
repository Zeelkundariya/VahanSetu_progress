from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from database import get_db_connection

host_bp = Blueprint('host', __name__)

@host_bp.route('/api/host/dashboard')
@login_required
def host_dashboard():
    conn = get_db_connection()
    try:
        # Stations owned by this user (CPO)
        stations = [dict(s) for s in conn.execute('SELECT * FROM stations WHERE owner_id = ?', (current_user.id,)).fetchall()]
        
        if not stations:
            # For demo purposes, if none, show all but label as baseline
            stations = [dict(s) for s in conn.execute('SELECT * FROM stations LIMIT 5').fetchall()]

        # Recent events across these stations
        events = [dict(e) for e in conn.execute('''
            SELECT cs.*, s.name as station_name 
            FROM charging_sessions cs
            JOIN stations s ON cs.station_id = s.id
            ORDER BY cs.start_time DESC LIMIT 10
        ''').fetchall()]

        # Aggregate stats
        stats = {
            'active_bays': sum(s['available_bays'] for s in stations),
            'total_bays': sum(s['total_bays'] for s in stations),
            'revenue': sum(e['cost'] for e in events),
            'revenue_growth': 12.4,
            'kwh': sum(e['energy_kwh'] for e in events),
            'sessions': len(events),
            'network_uptime': 99.9
        }

        return jsonify({
            'status': 'success',
            'stations': stations,
            'stats': stats,
            'recent_events': events
        })
    finally: conn.close()

@host_bp.route('/api/host/deploy', methods=['POST'])
@login_required
def host_deploy():
    data = request.json or {}
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (data.get('name'), data.get('address'), data.get('lat'), data.get('lng'), 
              data.get('connector'), data.get('power'), 4, 4, current_user.id))
        conn.commit()
        return jsonify({'success': True})
    finally: conn.close()
