import sqlite3
from datetime import datetime, timedelta
import random

import os
def get_db_connection():
    db_path = os.path.join(os.path.dirname(__file__), 'stations.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def force_seed():
    conn = get_db_connection()
    # Get all users
    users = conn.execute('SELECT id, name FROM users').fetchall()
    
    for user in users:
        user_id = user['id']
        print(f"Seeding for user: {user['name']} (ID: {user_id})")
        
        # Clear existing data to ensure fresh high-quality dummy data
        conn.execute('DELETE FROM charging_sessions WHERE vehicle_id IN (SELECT id FROM fleet_vehicles WHERE fleet_id IN (SELECT id FROM fleets WHERE user_id = ?))', (user_id,))
        conn.execute('DELETE FROM fleet_vehicles WHERE fleet_id IN (SELECT id FROM fleets WHERE user_id = ?)', (user_id,))
        conn.execute('DELETE FROM notifications WHERE user_id = ?', (user_id,))
        # Keep stations but ensure they have an owner if none
        conn.execute('UPDATE stations SET owner_id = ? WHERE owner_id IS NULL OR owner_id = 0', (user_id,))
        
        # 1. Fleet
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (user_id,)).fetchone()
        if not fleet:
            conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (user_id, 'Global Logistics Alpha'))
            fleet_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        else:
            fleet_id = fleet['id']
            
        demo_v = [
            (fleet_id, 'Intercity-Express 01', 'GJ-01-EV-1001', 4500.0, 54000.0, 'moving', 88, 23.0225, 72.5714),
            (fleet_id, 'Gandhinagar Shuttle', 'GJ-18-EV-2002', 2800.0, 33600.0, 'moving', 42, 23.2156, 72.6369),
            (fleet_id, 'Industrial Cargo-X', 'GJ-18-TX-0052', 8900.0, 106800.0, 'low_battery', 12, 23.23, 72.51),
            (fleet_id, 'Metro Delivery-04', 'GJ-01-AX-9999', 1200.0, 14400.0, 'idle', 95, 23.01, 72.55),
            (fleet_id, 'Executive Sedan 09', 'MH-01-EQ-7777', 2100.0, 25200.0, 'charging', 65, 19.0760, 72.8777)
        ]
        conn.executemany('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, total_kwh, total_spend, status, battery_pct, lat, lng) VALUES (?,?,?,?,?,?,?,?,?)', demo_v)
        
        # 2. Host Stations
        s_count = conn.execute('SELECT COUNT(*) FROM stations WHERE owner_id = ?', (user_id,)).fetchone()[0]
        if s_count < 3:
            demo_s = [
                ('Solaris Hub North', 'Ashram Road, Ahmedabad', 23.0338, 72.585, 'CCS2', 150, 12, 8, user_id),
                ('Nexus Gandhinagar', 'Sector 21, Gandhinagar', 23.2156, 72.6369, 'Type2', 60, 6, 2, user_id),
                ('Skyline Highway Node', 'NH-48, Kheda', 22.75, 72.68, 'CCS2', 240, 4, 1, user_id)
            ]
            conn.executemany('INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id) VALUES (?,?,?,?,?,?,?,?,?)', demo_s)
        
        # 3. Sessions
        vids = [r[0] for r in conn.execute('SELECT id FROM fleet_vehicles WHERE fleet_id = ?', (fleet_id,)).fetchall()]
        sids = [r[0] for r in conn.execute('SELECT id FROM stations').fetchall()]
        
        if vids and sids:
            demo_sess = []
            now = datetime.now()
            for i in range(30):
                vid = random.choice(vids)
                sid = random.choice(sids)
                energy = round(random.uniform(15.0, 85.0), 1)
                cost = round(energy * 15.5, 0)
                start = (now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))).strftime('%Y-%m-%d %H:%M:%S')
                end = (datetime.strptime(start, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=random.randint(30, 90))).strftime('%Y-%m-%d %H:%M:%S')
                demo_sess.append((vid, sid, energy, cost, start, end))
            conn.executemany('INSERT INTO charging_sessions (vehicle_id, station_id, energy_kwh, cost, start_time, end_time) VALUES (?,?,?,?,?,?)', demo_sess)
            
        # 4. Notifications
        demo_n = [
            (user_id, 'Industrial Cargo-X battery reached critical level (12%)'),
            (user_id, 'Solaris Hub North weekly revenue report is ready'),
            (user_id, 'New charging hub "Ahmedabad East" is now online near your route'),
            (user_id, 'Gandhinagar Shuttle scheduled maintenance in 48 hours')
        ]
        conn.executemany('INSERT INTO notifications (user_id, message) VALUES (?, ?)', demo_n)

    conn.commit()
    conn.close()
    print("Force seed complete with high-quality dummy data.")

if __name__ == "__main__":
    force_seed()
