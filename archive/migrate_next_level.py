import sqlite3
import os

def migrate():
    db_path = 'stations.db'
    if not os.path.exists(db_path):
        print("Database not found.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Starting Migration for Next-Level Features...")
    
    # 1. Update users table
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN carbon_credits REAL DEFAULT 0.0')
        print("Added carbon_credits to users.")
    except sqlite3.OperationalError:
        print("carbon_credits already exists in users.")

    # 2. Update fleet_vehicles table
    try:
        cursor.execute('ALTER TABLE fleet_vehicles ADD COLUMN battery_temp REAL DEFAULT 25.0')
        cursor.execute('ALTER TABLE fleet_vehicles ADD COLUMN cell_voltage REAL DEFAULT 3.7')
        print("Added telemetry columns to fleet_vehicles.")
    except sqlite3.OperationalError:
        print("Telemetry columns already exist in fleet_vehicles.")

    # 3. Update stations table
    try:
        cursor.execute('ALTER TABLE stations ADD COLUMN current_load REAL DEFAULT 0.0')
        cursor.execute('ALTER TABLE stations ADD COLUMN price_per_kwh REAL DEFAULT 18.5')
        print("Added load/pricing columns to stations.")
    except sqlite3.OperationalError:
        print("Load/pricing columns already exist in stations.")

    # 4. Create new tables
    cursor.execute('CREATE TABLE IF NOT EXISTS carbon_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, source TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')
    cursor.execute('CREATE TABLE IF NOT EXISTS grid_forecast (id INTEGER PRIMARY KEY AUTOINCREMENT, hour INTEGER, load_factor REAL, price_multiplier REAL)')
    print("Created Ledger and Forecast tables.")

    conn.commit()
    conn.close()
    print("Migration Successful.")

if __name__ == '__main__':
    migrate()
