import sqlite3
import random
from datetime import datetime, timedelta

def populate_demo():
    conn = sqlite3.connect('stations.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Identify Target Users (Zeel and Test)
    users = cursor.execute('SELECT id, name FROM users WHERE name LIKE "Zeel%" OR email = "test@gmail.com"').fetchall()
    uids = [u['id'] for u in users]
    print(f"Targeting User IDs: {uids}")

    # 2. Transfer ALL stations to these users (split them)
    stations = cursor.execute('SELECT id FROM stations').fetchall()
    sids = [s['id'] for s in stations]
    
    if not sids:
        print("No stations found. Seeding base hubs first.")
        # Minimal hubs if DB was wiped
        hubs = [("Demo Hub Alpha", 23.0, 72.0), ("Demo Hub Beta", 23.1, 72.1)]
        for h in hubs:
            cursor.execute('INSERT INTO stations (name, lat, lng, power_kw, total_bays, owner_id) VALUES (?,?,?, 150, 8, ?)', (h[0], h[1], h[2], uids[0]))
        conn.commit()
        stations = cursor.execute('SELECT id FROM stations').fetchall()
        sids = [s['id'] for s in stations]

    for sid in sids:
        # Assign each station to a random target user
        cursor.execute('UPDATE stations SET owner_id = ? WHERE id = ?', (random.choice(uids), sid))
    
    # 3. Wipe and Repopulate Sessions (High Volume)
    cursor.execute('DELETE FROM charging_sessions')
    
    fleet = cursor.execute('SELECT id FROM fleet_vehicles').fetchall()
    fvids = [f['id'] for f in fleet] if fleet else [1,2,3,4,5]

    sessions = []
    # Generate 500+ sessions for high-fidelity charts
    for _ in range(500):
        energy = round(random.uniform(25.0, 95.0), 1)
        cost = round(energy * 18.5, 2)
        # Dates spread across last 30 days
        ts = (datetime.now() - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23), minutes=random.randint(0, 59))).strftime('%Y-%m-%d %H:%M:%S')
        te = (datetime.strptime(ts, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=random.randint(20, 120))).strftime('%Y-%m-%d %H:%M:%S')
        sessions.append((random.choice(fvids), random.choice(sids), energy, cost, ts, te))

    cursor.executemany('INSERT INTO charging_sessions (vehicle_id, station_id, energy_kwh, cost, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)', sessions)

    # 4. Global Stats Verification (Analysis Dashboard often uses global agg)
    # Ensure stats are visible
    for uid in uids:
        cursor.execute('INSERT OR IGNORE INTO fleets (user_id, fleet_name) VALUES (?, ?)', (uid, "Nexus Main Fleet"))
        cursor.execute('DELETE FROM notifications WHERE user_id = ?', (uid,))
        for msg in ["Network revenue up 18% this week", "All 150kW hubs operating at 99.8% uptime", "New charging partner identified: Shell Recharge"]:
            cursor.execute('INSERT INTO notifications (user_id, message) VALUES (?, ?)', (uid, msg))

    conn.commit()
    conn.close()
    print(f"SUCCESS: Demo data provisioned for User IDs {uids}. 500 sessions linked.")

if __name__ == "__main__":
    populate_demo()
