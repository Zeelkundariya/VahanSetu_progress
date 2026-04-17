import sqlite3
import random
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

def seed_professional_data():
    conn = sqlite3.connect('stations.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Target users
    target_users = [
        {'id': 1, 'name': 'Steward'},
        {'id': 2, 'name': 'Zeel'}
    ]
    uids = [u['id'] for u in target_users]

    print(f"--- SEEDING PROFESSIONAL DATA FOR USERS: {uids} ---")

    # 1. Setup Fleets
    cursor.execute('DELETE FROM fleets WHERE user_id IN (1, 2)')
    cursor.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (1, 'Vahan Nexus Global'))
    fleet1_id = cursor.lastrowid
    cursor.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (2, 'Zeel Enterprise Logistics'))
    fleet2_id = cursor.lastrowid

    # 2. Add High-Fidelity Vehicles
    cursor.execute('DELETE FROM fleet_vehicles WHERE fleet_id IN (?, ?)', (fleet1_id, fleet2_id))
    vehicles = [
        # Fleet 1
        (fleet1_id, 'Tesla Model 3 Long Range', 'GJ-01-TX-0001', 92, 480.5, 23.0225, 72.5714, 'moving', 4500.0, 54000.0),
        (fleet1_id, 'Audi e-tron GT', 'GJ-01-AX-9999', 45, 210.0, 23.2156, 72.6369, 'charging', 12000.0, 144000.0),
        (fleet1_id, 'Mercedes-Benz EQS', 'MH-01-EQ-7777', 88, 550.0, 19.0760, 72.8777, 'idle', 8000.0, 96000.0),
        (fleet1_id, 'Porsche Taycan Turbo', 'KA-01-PT-4444', 12, 45.0, 12.9716, 77.5946, 'low_battery', 15000.0, 180000.0),
        (fleet1_id, 'BYD Atto 3', 'DL-01-BY-1234', 67, 310.0, 28.6139, 77.2090, 'moving', 3000.0, 36000.0),
        # Fleet 2
        (fleet2_id, 'Tata Nexon EV Max', 'GJ-18-NX-1001', 82, 320.0, 23.2156, 72.6369, 'idle', 2500.0, 30000.0),
        (fleet2_id, 'Mahindra XUV400', 'GJ-18-MX-2002', 15, 60.0, 23.0225, 72.5714, 'moving', 1800.0, 21600.0),
        (fleet2_id, 'Hyundai IONIQ 5', 'GJ-05-HY-5555', 95, 410.0, 21.1702, 72.8311, 'idle', 5000.0, 60000.0),
        (fleet2_id, 'MG ZS EV', 'GJ-06-MG-6666', 42, 180.0, 22.3072, 73.1812, 'charging', 4200.0, 50400.0),
        (fleet2_id, 'Kia EV6 GT', 'GJ-27-KV-8888', 78, 380.0, 24.5854, 73.7125, 'moving', 6000.0, 72000.0),
    ]
    cursor.executemany('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, battery_pct, range_km, lat, lng, status, total_energy, total_cost) VALUES (?,?,?,?,?,?,?,?,?,?)', vehicles)
    
    # Get all vehicle IDs for later
    cursor.execute('SELECT id FROM fleet_vehicles')
    all_vids = [r['id'] for r in cursor.fetchall()]

    # 3. Professional Stations (Host Portal)
    cursor.execute('DELETE FROM stations WHERE owner_id IN (1, 2)')
    stations = [
        # User 1 (Steward)
        ('Ahmedabad Super Hub', 'Riverfront, Ahmedabad', 23.0225, 72.5714, 'CCS2', 150, 12, 8, 1),
        ('Gandhinagar Tech Hub', 'Infocity, Gandhinagar', 23.2300, 72.6300, 'CCS2', 60, 6, 2, 1),
        ('Mumbai Marine Hub', 'Marine Drive, Mumbai', 18.9438, 72.8236, 'CCS2 / Type 2', 120, 10, 4, 1),
        ('Delhi Connaught Square', 'CP, Delhi', 28.6328, 77.2197, 'CCS2', 180, 8, 1, 1),
        ('Bangalore Silk Board', 'Silk Board, Bangalore', 12.9176, 77.6233, 'CCS2', 60, 4, 3, 1),
        # User 2 (Zeel)
        ('Surat Diamond Hub', 'Dream City, Surat', 21.1440, 72.7667, 'CCS2', 150, 8, 4, 2),
        ('Vadodara Express Hub', 'Gotri Road, Vadodara', 22.3100, 73.1400, 'CCS2', 60, 6, 1, 2),
        ('Rajkot Ring Road Hub', 'Kalavad Road, Rajkot', 22.2800, 70.7800, 'Type 2', 30, 4, 3, 2),
        ('Udaipur City Palace Hub', 'City Palace, Udaipur', 24.5764, 73.6835, 'CCS2', 60, 4, 0, 2),
        ('Pune IT corridor Hub', 'Hinjewadi, Pune', 18.5913, 73.7389, 'CCS2 / Type 2', 120, 12, 10, 2),
    ]
    cursor.executemany('INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id) VALUES (?,?,?,?,?,?,?,?,?)', stations)
    
    # Pre-fetch power levels for efficiency
    cursor.execute('SELECT id, power_kw FROM stations')
    station_power_map = {r['id']: r['power_kw'] for r in cursor.fetchall()}
    all_sids = list(station_power_map.keys())

    # 4. Generate High-Volume Charging Sessions (Analysis & Profile)
    print("Generating 2500+ charging sessions for massive analytics...")
    cursor.execute('DELETE FROM charging_sessions')
    
    sessions = []
    now = datetime.now()
    # Past 90 days of data for rich trends
    for _ in range(2500):
        vid = random.choice(all_vids)
        sid = random.choice(all_sids)
        energy_kwh = round(random.uniform(15.0, 85.0), 2)
        
        pwr = station_power_map[sid]
        price_per_kwh = 18.0 if pwr > 100 else 12.0
        cost = round(energy_kwh * price_per_kwh, 2)
        
        # Weighted timestamp (more recent = more likely)
        days_ago = int(random.triangular(0, 90, 0)) # skewed towards 0 (now)
        start_dt = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
        end_dt = start_dt + timedelta(minutes=random.randint(20, 150))
        
        sessions.append((vid, sid, energy_kwh, cost, start_dt.strftime('%Y-%m-%d %H:%M:%S'), end_dt.strftime('%Y-%m-%d %H:%M:%S')))

    cursor.executemany('INSERT INTO charging_sessions (vehicle_id, station_id, energy_kwh, cost, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)', sessions)

    # 5. Notifications
    cursor.execute('DELETE FROM notifications WHERE user_id IN (1, 2)')
    for uid in uids:
        msgs = [
            f"Welcome to VahanSetu Nexus, {target_users[uid-1]['name']}!",
            "Quarterly Energy Report is ready for download.",
            "Alert: Station 'Ahmedabad Super Hub' reached peak utilization (100%).",
            "Security Upgrade: Biometric logout enabled for Host Portal.",
            "Vehicle 'Tesla Model 3' maintenance scheduled for next Friday.",
            "New Premium feature: Predictive range analysis now active."
        ]
        for m in msgs:
            cursor.execute('INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, ?)', (uid, m, 0))

    conn.commit()
    conn.close()
    print("SUCCESS: Professional-grade data seeded. 2500+ sessions, 10 vehicles, 10 hubs.")

if __name__ == "__main__":
    seed_professional_data()
