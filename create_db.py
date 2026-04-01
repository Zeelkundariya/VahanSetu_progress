import sqlite3
from werkzeug.security import generate_password_hash

conn = sqlite3.connect('stations.db')
cursor = conn.cursor()

# --- Helper to add column if missing ---
def add_column_if_not_exists(table, column, column_type):
    try:
        cursor.execute(f'ALTER TABLE {table} ADD COLUMN {column} {column_type}')
        print(f"Added column {column} to {table}")
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e):
            print(f"Column {column} already exists in {table}")
        else:
            print(f"Error adding {column}: {e}")

# --- Stations table ---
cursor.execute('''
    CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        lat REAL,
        lng REAL,
        address TEXT,
        connector_type TEXT,
        power_kw INTEGER,
        total_bays INTEGER,
        available_bays INTEGER,
        queue_length INTEGER,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
''')
# Add missing columns if they don't exist
add_column_if_not_exists('stations', 'image_url', 'TEXT')
add_column_if_not_exists('stations', 'opening_hours', 'TEXT')
add_column_if_not_exists('stations', 'station_type', 'TEXT DEFAULT "city"')
add_column_if_not_exists('stations', 'owner_id', 'INTEGER')
add_column_if_not_exists('stations', 'price_per_kwh', 'REAL DEFAULT 15.0')
add_column_if_not_exists('stations', 'last_updated', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

# --- Users table ---
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
    )
''')
# Add columns for older databases
add_column_if_not_exists('users', 'role', 'TEXT DEFAULT "user"')
add_column_if_not_exists('users', 'is_premium', 'INTEGER DEFAULT 0')

# --- Station History table (for analytics) ---
cursor.execute('''
    CREATE TABLE IF NOT EXISTS station_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER,
        available_bays INTEGER,
        queue_length INTEGER,
        total_bays INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(station_id) REFERENCES stations(id)
    )
''')

# --- Reports table ---
cursor.execute('''
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER,
        reported_queue INTEGER,
        comment TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(station_id) REFERENCES stations(id)
    )
''')

# --- Ratings table ---
cursor.execute('''
    CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        review TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(station_id) REFERENCES stations(id)
    )
''')

# --- Favorites table ---
cursor.execute('''
    CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER,
        station_id INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(station_id) REFERENCES stations(id),
        PRIMARY KEY (user_id, station_id)
    )
''')

# --- Visited table ---
cursor.execute('''
    CREATE TABLE IF NOT EXISTS visited (
        user_id INTEGER,
        station_id INTEGER,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(station_id) REFERENCES stations(id)
    )
''')

# Insert sample stations only if table is empty
cursor.execute('SELECT COUNT(*) FROM stations')
if cursor.fetchone()[0] == 0:
    sample_stations = [
        ('Tata Power - Koramangala', 12.9352, 77.6245, 'Koramangala, Bengaluru', 'CCS2', 60, 4, 2, 1, '', '', 'city'),
        ('HP e-Charge - Indiranagar', 12.9784, 77.6408, 'Indiranagar, Bengaluru', 'CCS2', 30, 2, 1, 1, '', '', 'city'),
        ('chargeMOD - MG Road', 12.9759, 77.6065, 'MG Road, Bengaluru', 'Type2', 22, 3, 3, 0, '', '', 'city'),
        ('Statiq - HSR Layout', 12.9115, 77.6447, 'HSR Layout, Bengaluru', 'CHAdeMO', 50, 2, 0, 2, '', '', 'city'),
        ('Tata Power - Whitefield', 12.9698, 77.7500, 'Whitefield, Bengaluru', 'CCS2', 120, 1, 1, 0, '', '', 'highway'),
    ]
    cursor.executemany('''
        INSERT INTO stations (name, lat, lng, address, connector_type, power_kw, total_bays, available_bays, queue_length, image_url, opening_hours, station_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', sample_stations)
    print("Inserted sample stations.")
# Add these tables to create_db.py if not already present
cursor.execute('''
    CREATE TABLE IF NOT EXISTS fleets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        fleet_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS fleet_vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fleet_id INTEGER NOT NULL,
        vehicle_name TEXT NOT NULL,
        vehicle_number TEXT NOT NULL,
        total_kwh REAL DEFAULT 0,
        total_spend REAL DEFAULT 0,
        status TEXT DEFAULT 'idle',
        battery_pct INTEGER DEFAULT 80,
        lat REAL,
        lng REAL,
        FOREIGN KEY(fleet_id) REFERENCES fleets(id)
    )
''')
# Ensure columns exist in migrated databases
add_column_if_not_exists('fleet_vehicles', 'total_kwh', 'REAL DEFAULT 0')
add_column_if_not_exists('fleet_vehicles', 'total_spend', 'REAL DEFAULT 0')
add_column_if_not_exists('fleet_vehicles', 'status', "TEXT DEFAULT 'idle'")
add_column_if_not_exists('fleet_vehicles', 'battery_pct', 'INTEGER DEFAULT 80')
add_column_if_not_exists('fleet_vehicles', 'lat', 'REAL')
add_column_if_not_exists('fleet_vehicles', 'lng', 'REAL')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS charging_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        station_id INTEGER NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        energy_kwh REAL,
        cost REAL,
        FOREIGN KEY(vehicle_id) REFERENCES fleet_vehicles(id),
        FOREIGN KEY(station_id) REFERENCES stations(id)
    )
''')
# Insert a test user (if not exists)
cursor.execute('SELECT COUNT(*) FROM users WHERE email = "test@example.com"')
if cursor.fetchone()[0] == 0:
    test_user = ('Test User', 'test@example.com', generate_password_hash('test123'), 'admin')
    cursor.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', test_user)
    print("Inserted test user (admin).")

conn.commit()
conn.close()
print("Database setup complete.")

