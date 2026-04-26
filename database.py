import os
import sqlite3
from flask import g

def get_db_connection():
    db_path = os.path.join(os.path.dirname(__file__), 'stations.db')
    conn = sqlite3.connect(db_path, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    return conn

def init_db():
    conn = get_db_connection()
    # Table definitions (extracted from app.py)
    conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT "user", is_premium INTEGER DEFAULT 0)')
    conn.execute('CREATE TABLE IF NOT EXISTS fleets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, fleet_name TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS fleet_vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, fleet_id INTEGER, vehicle_name TEXT, vehicle_number TEXT, total_kwh REAL, total_spend REAL, battery_pct INTEGER, range_km REAL, lat REAL, lng REAL, status TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS stations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, address TEXT, lat REAL, lng REAL, connector_type TEXT, power_kw INTEGER, total_bays INTEGER, available_bays INTEGER, owner_id INTEGER)')
    conn.execute('CREATE TABLE IF NOT EXISTS charging_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER, station_id INTEGER, energy_kwh REAL, cost REAL, start_time TEXT, end_time TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, station_id INTEGER)')
    conn.execute('CREATE TABLE IF NOT EXISTS security_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip_address TEXT, device_agent TEXT, status TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, message TEXT, is_read INTEGER DEFAULT 0)')
    conn.commit()
    conn.close()
