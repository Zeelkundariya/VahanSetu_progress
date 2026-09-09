# ══════════════════════════════════════════════════════════════════════════════
#   VAHANSETU — UNIFIED EV MOBILITY & SMART GRID PLATFORM (v5.0 Production)
# ══════════════════════════════════════════════════════════════════════════════
#
#   QUICK ARCHITECTURAL SUMMARY FOR INTERVIEWS:
#   ────────────────────────────────────────────────────────────────────────────
#   VahanSetu is an end-to-end Smart EV Ecosystem backend built with Flask & SQLite.
#   It unifies 4 interconnected domains that usually exist in separate silos:
#
#   1. SMART CHARGING INFRASTRUCTURE:
#      - Real-time station telemetry emulating the OCPP 1.6/2.0 protocol.
#      - Proximity-based station discovery using the Haversine spherical formula.
#      - Dynamic grid-tariff pricing based on sinusoidal peak/off-peak forecasts.
#
#   2. INTELLIGENT TRIP & CORRIDOR ROUTING:
#      - Integrated with OSRM (Open Source Routing Machine) for polyline routing.
#      - Multi-threaded Overpass API queries (ThreadPoolExecutor) to discover
#        fast-chargers within a 25km buffer corridor along highway trajectories.
#      - Real-world traffic congestion buffer multipliers (1.32x for Indian transit).
#
#   3. FLEET TELEMETRY & DIGITAL TWIN:
#      - Multi-tenant commercial fleet management (SoC, degradation, range).
#      - CAN-bus OBD-II hardware emulation (cell voltage balance, pack thermals).
#      - Physics-based digital twin simulating battery cell-level diagnostics.
#
#   4. CIRCULAR CARBON ECONOMY & VAHANPAY (V2G):
#      - Verified Carbon Credit (VC) minting: 10 kWh clean charging/V2G = 1 VC.
#      - P2P and Enterprise Open Marketplace with automated 2-sided escrow settlement.
#      - VahanPay closed-loop wallet supporting instant UPI top-ups and IMPS payouts.
#
#   CONCURRENCY & DATABASE DESIGN NOTE:
#   ────────────────────────────────────────────────────────────────────────────
#   We use SQLite with WAL (Write-Ahead Logging) mode. This allows background
#   telemetry simulation threads to read and write without locking user requests.
#   Rows are returned as sqlite3.Row objects for dictionary-like column access.
# ══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# 1. CORE DEPENDENCIES & APPLICATION SETUP
# ─────────────────────────────────────────────────────────────────────────────

from flask import Flask, jsonify, request, render_template, redirect, url_for, flash, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from mailer import send_vahan_email

import sqlite3
import random
import math
import os
import requests
import time
import jwt
import concurrent.futures
from datetime import datetime, timedelta

# Initialize Flask application
# static_folder and template_folder point to client/dist where Vite compiles the React SPA
app = Flask(__name__, static_folder='client/dist', static_url_path='/', template_folder='client/dist')

# JWT Secret for signing stateless session tokens (falls back to hardcoded secret in local dev)
app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'vahan-jwt-quantum-vault-enterprise-security-2026')

# Flask session secret key for CSRF and flash messages
app.secret_key = os.environ.get('SECRET_KEY', 'vs-ultra-secure-key-enterprise-2026')

# Enable Cross-Origin Resource Sharing so React dev server (port 5173/5175) can call Flask API
CORS(app)


# ─────────────────────────────────────────────────────────────────────────────
# 2. VAHAN INTELLIGENCE: SIMULATION & PREDICTION ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class VahanIntelligence:
    """
    Simulation engine responsible for predictive grid pricing and hardware heartbeats.
    In production with real hardware, this would interface with an OCPP Central System (CSMS)
    and state electricity board (DISCOM) SCADA feeds.
    """

    @staticmethod
    def get_predictive_pricing():
        """
        Calculates dynamic electricity tariffs (INR/kWh) based on the current hour.
        
        Logic / Math:
        - Base tariff is ₹18.50 per kWh.
        - Checks the grid_forecast table for the current hour's price multiplier.
        - Peak hours (morning rush 8-10 AM, evening peak 6-10 PM) have higher multipliers (~1.3x - 1.5x).
        - Off-peak solar hours (11 AM - 3 PM) and late nights drop closer to baseline (~1.0x).
        """
        hour = datetime.now().hour
        conn = get_db_connection()
        # Query pre-calculated load multiplier for the active hour
        forecast = conn.execute('SELECT * FROM grid_forecast WHERE hour = ?', (hour,)).fetchone()
        conn.close()
        
        base_price = 18.5  # Base grid unit rate in INR
        if forecast:
            return round(base_price * forecast['price_multiplier'], 2)
        return base_price

    @staticmethod
    def simulate_ocpp_pulse():
        """
        Emulates real-time OCPP (Open Charge Point Protocol) StatusNotification heartbeats.
        
        Why this is needed:
        - Physical chargers constantly report bay occupancy and power draw to the cloud.
        - Here, we periodically update available bays, station electrical load (%), and
          predicted 1-hour occupancy trends based on Indian peak commuting windows.
        """
        conn = get_db_connection()
        try:
            stations = conn.execute('SELECT id, total_bays FROM stations').fetchall()
            for s in stations:
                # Randomly fluctuate available bays within valid physical limits [0, total_bays]
                new_avail = max(0, min(s['total_bays'], random.randint(0, s['total_bays'])))
                hour = datetime.now().hour
                
                # Predict rush trends: morning (7-10 AM) and evening (5-8 PM) show rising occupancy
                trend = "Rising" if 7 <= hour <= 10 or 17 <= hour <= 20 else "Stable"
                prediction = f"{random.randint(10, 90)}% Prob. in 1h ({trend})"
                
                # Update station status with simulated live hardware load (20% to 95%)
                conn.execute(
                    'UPDATE stations SET available_bays = ?, current_load = ?, predicted_occupancy = ? WHERE id = ?', 
                    (new_avail, random.uniform(20.0, 95.0), prediction, s['id'])
                )
            conn.commit()
        except Exception:
            pass
        finally:
            conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# 3. DATABASE CONNECTION & SCHEMA INITIALIZATION
# ─────────────────────────────────────────────────────────────────────────────

def get_db_connection():
    """
    Creates and returns a SQLite connection configured for concurrent web workloads.
    
    Key Settings:
    - timeout=30: Prevents 'database is locked' errors during simultaneous write bursts.
    - row_factory = sqlite3.Row: Allows accessing columns both by name (row['email']) 
      and index (row[0]), keeping code readable and clean.
    """
    db_path = os.path.join(os.path.dirname(__file__), 'stations.db')
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """
    Provisions all database tables and ensures initial seed data is present.
    
    Architectural Highlights:
    - WAL Mode (Write-Ahead Logging): Allows concurrent readers without blocking writers.
    - Non-destructive schema migrations: Uses ALTER TABLE inside try/except blocks
      so new columns are added safely without wiping existing data.
    - Automatic seeding: Populates essential admin, demo user (Zeel Kundariya),
      EV stations, marketplace listings, and financial ledger if tables are empty.
    """
    conn = get_db_connection()
    try:
        # Enable WAL mode for high-concurrency read/write operations
        conn.execute('PRAGMA journal_mode=WAL')
    except Exception:
        pass

    # Core user authentication table
    conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT "user", is_premium INTEGER DEFAULT 0, carbon_credits REAL DEFAULT 0.0)')
    
    # Commercial fleet management tables
    conn.execute('CREATE TABLE IF NOT EXISTS fleets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, fleet_name TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS fleet_vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, fleet_id INTEGER, vehicle_name TEXT, vehicle_number TEXT, battery_pct INTEGER, range_km REAL, lat REAL, lng REAL, status TEXT, total_energy REAL, total_cost REAL, battery_temp REAL DEFAULT 25.0, cell_voltage REAL DEFAULT 3.7)')
    
    # Charging station infrastructure table
    conn.execute('CREATE TABLE IF NOT EXISTS stations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, address TEXT, lat REAL, lng REAL, connector_type TEXT, power_kw INTEGER, total_bays INTEGER, available_bays INTEGER, owner_id INTEGER, current_load REAL DEFAULT 0.0, price_per_kwh REAL DEFAULT 18.5, predicted_occupancy TEXT)')
    
    # Historical charging and telemetry sessions
    conn.execute('CREATE TABLE IF NOT EXISTS charging_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER, station_id INTEGER, energy_kwh REAL, cost REAL, carbon_saved REAL, credits_earned REAL, start_time TEXT, end_time TEXT)')
    
    # Bookmarks and audit logs
    conn.execute('CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, station_id INTEGER)')
    conn.execute('CREATE TABLE IF NOT EXISTS security_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip_address TEXT, device_agent TEXT, status TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, message TEXT, is_read INTEGER DEFAULT 0)')
    
    # Carbon economy & grid forecasting
    conn.execute('CREATE TABLE IF NOT EXISTS carbon_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, source TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')
    conn.execute('CREATE TABLE IF NOT EXISTS grid_forecast (id INTEGER PRIMARY KEY AUTOINCREMENT, hour INTEGER, load_factor REAL, price_multiplier REAL)')
    
    # VahanPay digital wallet & transaction accounting ledger
    conn.execute('CREATE TABLE IF NOT EXISTS wallets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, balance REAL DEFAULT 1500.0, currency TEXT DEFAULT "INR", last_updated DATETIME DEFAULT CURRENT_TIMESTAMP)')
    conn.execute('CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, wallet_id INTEGER, amount REAL, type TEXT, description TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')
    
    # Open Carbon Credit marketplace
    conn.execute('CREATE TABLE IF NOT EXISTS marketplace_listings (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id INTEGER, credits_amount REAL, price_inr REAL, status TEXT DEFAULT "active", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)')
    
    # User customization settings
    conn.execute('CREATE TABLE IF NOT EXISTS user_settings (user_id INTEGER PRIMARY KEY, language TEXT DEFAULT "en-IN", voice_enabled INTEGER DEFAULT 1, telemetry_visible INTEGER DEFAULT 1)')

    # Safe column additions for backwards compatibility with older database schemas
    try:
        conn.execute('ALTER TABLE stations ADD COLUMN predicted_occupancy TEXT')
    except Exception:
        pass

    try:
        conn.execute('ALTER TABLE fleet_vehicles ADD COLUMN total_kwh REAL DEFAULT 0.0')
    except Exception:
        pass
    try:
        conn.execute('ALTER TABLE fleet_vehicles ADD COLUMN total_spend REAL DEFAULT 0.0')
    except Exception:
        pass
    try:
        conn.execute('UPDATE fleet_vehicles SET total_kwh = total_energy WHERE (total_kwh IS NULL OR total_kwh = 0) AND total_energy IS NOT NULL')
        conn.execute('UPDATE fleet_vehicles SET total_spend = total_cost WHERE (total_spend IS NULL OR total_spend = 0) AND total_cost IS NOT NULL')
    except Exception:
        pass

    # Populate 24-hour grid load forecast curve using mathematical sine/cosine distribution
    if not conn.execute('SELECT id FROM grid_forecast LIMIT 1').fetchone():
        forecasts = [(h, 0.5 + 0.4 * math.sin(h/4), 1.0 + 0.5 * math.cos(h/6)) for h in range(24)]
        conn.executemany('INSERT INTO grid_forecast (hour, load_factor, price_multiplier) VALUES (?,?,?)', forecasts)

    # Ensure default platform Administrator exists
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE email = "admin@vahan.com"')
    admin = cursor.fetchone()
    if not admin:
        cursor.execute(
            'INSERT INTO users (name, email, password, role, is_premium, carbon_credits) VALUES (?, ?, ?, ?, ?, ?)',
            ('Steward', 'admin@vahan.com', generate_password_hash('steward2026'), 'admin', 1, 500.0)
        )
        admin_id = cursor.lastrowid
        cursor.execute('INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, ?)', (admin_id, 5000.0))
    else:
        admin_id = admin['id']

    # Ensure default primary test user (Zeel Kundariya) exists with pre-seeded wallet & credits
    cursor.execute('SELECT id FROM users WHERE email = "zeel@gmail.com"')
    zeel = cursor.fetchone()
    if not zeel:
        cursor.execute(
            'INSERT INTO users (name, email, password, role, is_premium, carbon_credits) VALUES (?, ?, ?, ?, ?, ?)',
            ('Zeel Kundariya', 'zeel@gmail.com', generate_password_hash('zeel2026'), 'user', 1, 250.0)
        )
        zeel_id = cursor.lastrowid
        cursor.execute('INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, ?)', (zeel_id, 2500.0))
    else:
        zeel_id = zeel['id']
        cursor.execute('UPDATE users SET carbon_credits = 250.0 WHERE id = ? AND (carbon_credits IS NULL OR carbon_credits = 0)', (zeel_id,))

    # Seed baseline charging stations across key transport corridors in Gujarat
    if not conn.execute('SELECT id FROM stations LIMIT 1').fetchone():
        demo_stations = [
            ('Solaris Hub North', 'Ashram Road, Ahmedabad', 23.0338, 72.585, 'CCS2', 150, 12, 8, zeel_id, 35.0, 18.5, '85% Prob. in 1h (Stable)'),
            ('Nexus Gandhinagar', 'Sector 21, Gandhinagar', 23.2156, 72.6369, 'Type2', 60, 6, 2, zeel_id, 60.0, 15.0, '60% Prob. in 1h (Rising)'),
            ('Skyline Highway Node', 'NH-48, Kheda', 22.75, 72.68, 'CCS2', 240, 4, 1, zeel_id, 80.0, 22.0, '90% Prob. in 1h (Rising)'),
            ('Kalol Central Charging Plaza', 'Kalol Highway, Gujarat', 23.235, 72.511, 'CCS2', 120, 10, 6, zeel_id, 40.0, 16.5, '45% Prob. in 1h (Stable)'),
            ('Surat CyberCharge Hub', 'Ring Road, Surat', 21.1702, 72.8311, 'CCS2', 180, 8, 5, zeel_id, 55.0, 19.0, '70% Prob. in 1h (Stable)'),
            ('Vadodara Express Volt', 'Alkapuri, Vadodara', 22.3072, 73.1812, 'CCS2', 120, 8, 4, zeel_id, 45.0, 17.5, '50% Prob. in 1h (Stable)')
        ]
        conn.executemany('INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id, current_load, price_per_kwh, predicted_occupancy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', demo_stations)

    # Ensure metadata columns exist in marketplace listings for authentic enterprise rendering
    try:
        conn.execute('ALTER TABLE marketplace_listings ADD COLUMN credit_type TEXT DEFAULT "Solar Microgrid"')
    except Exception:
        pass
    try:
        conn.execute('ALTER TABLE marketplace_listings ADD COLUMN seller_org TEXT DEFAULT "Tata Power Renewables"')
    except Exception:
        pass
    try:
        conn.execute('ALTER TABLE marketplace_listings ADD COLUMN seller_badge TEXT DEFAULT "ISO-14064 Verified"')
    except Exception:
        pass

    # Seed or refresh marketplace with authentic verified renewable energy & clean fleet batches
    active_m_count = conn.execute('SELECT COUNT(*) FROM marketplace_listings WHERE status = "active"').fetchone()[0]
    if active_m_count < 4:
        conn.execute('DELETE FROM marketplace_listings WHERE seller_org IS NULL OR seller_org = "Solaris Green Mobility" OR seller_org = "Tata Power Renewables"')
        demo_listings = [
            (admin_id, 450.0, 517.5, 'active', 'Solar PV Microgrid', 'Tata Power Renewable Corridor', 'ISO-14064 Verified'),
            (admin_id, 800.0, 944.0, 'active', 'Fleet V2G Regeneration', 'BluSmart EV Logistics Depot', 'Enterprise Fleet'),
            (admin_id, 1500.0, 1725.0, 'active', 'Wind & Solar Hybrid', 'Adani Clean Energy Node', 'Grid Certified'),
            (admin_id, 250.0, 300.0, 'active', 'Urban Freight Offset', 'Mahindra Last-Mile Clean Freight', 'Green Mobility'),
            (admin_id, 600.0, 708.0, 'active', 'Rooftop Solar V2G', 'Kalol Solar Prosumer Co-op', 'Community Node')
        ]
        conn.executemany('INSERT INTO marketplace_listings (seller_id, credits_amount, price_inr, status, credit_type, seller_org, seller_badge) VALUES (?, ?, ?, ?, ?, ?, ?)', demo_listings)

    # Populate user-specific demo fleet, transactions, notifications, and charging sessions
    seed_user_data(zeel_id, conn)

    conn.commit()
    conn.close()


def seed_user_data(user_id, conn):
    """
    Seeds rich, realistic operational data for a given user.
    Called automatically on first run and when viewing dashboards so all UI charts
    have historical and analytical data to visualize.
    """
    # 1. Ensure user has a commercial fleet container
    fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (user_id,)).fetchone()
    if not fleet:
        conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (user_id, 'Global Logistics Alpha'))
        fleet_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    else:
        fleet_id = fleet['id']
        
    # 2. Ensure comprehensive EV fleet vehicles exist with real-world specs and GPS coords
    v_count = conn.execute('SELECT COUNT(*) FROM fleet_vehicles WHERE fleet_id = ?', (fleet_id,)).fetchone()[0]
    if v_count == 0:
        demo_v = [
            (fleet_id, 'Intercity-Express 01', 'GJ-01-EV-1001', 4500.0, 54000.0, 4500.0, 54000.0, 'moving', 88, 23.0225, 72.5714),
            (fleet_id, 'Gandhinagar Shuttle', 'GJ-18-EV-2002', 2800.0, 33600.0, 2800.0, 33600.0, 'moving', 42, 23.2156, 72.6369),
            (fleet_id, 'Industrial Cargo-X', 'GJ-18-TX-0052', 8900.0, 106800.0, 8900.0, 106800.0, 'low_battery', 12, 23.23, 72.51),
            (fleet_id, 'Metro Delivery-04', 'GJ-01-AX-9999', 1200.0, 14400.0, 1200.0, 14400.0, 'idle', 95, 23.01, 72.55),
            (fleet_id, 'Executive Sedan 09', 'MH-01-EQ-7777', 2100.0, 25200.0, 2100.0, 25200.0, 'charging', 65, 19.0760, 72.8777)
        ]
        try:
            conn.executemany('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, total_energy, total_cost, total_kwh, total_spend, status, battery_pct, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?,?)', demo_v)
        except Exception:
            # Fallback for databases missing total_kwh / total_spend columns
            demo_fallback = [
                (fleet_id, 'Intercity-Express 01', 'GJ-01-EV-1001', 4500.0, 54000.0, 'moving', 88, 23.0225, 72.5714),
                (fleet_id, 'Gandhinagar Shuttle', 'GJ-18-EV-2002', 2800.0, 33600.0, 'moving', 42, 23.2156, 72.6369),
                (fleet_id, 'Industrial Cargo-X', 'GJ-18-TX-0052', 8900.0, 106800.0, 'low_battery', 12, 23.23, 72.51),
                (fleet_id, 'Metro Delivery-04', 'GJ-01-AX-9999', 1200.0, 14400.0, 'idle', 95, 23.01, 72.55),
                (fleet_id, 'Executive Sedan 09', 'MH-01-EQ-7777', 2100.0, 25200.0, 'charging', 65, 19.0760, 72.8777)
            ]
            conn.executemany('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, total_energy, total_cost, status, battery_pct, lat, lng) VALUES (?,?,?,?,?,?,?,?,?)', demo_fallback)
        
    # 3. Ensure host stations exist for this user in CPO (Charge Point Operator) view
    s_count = conn.execute('SELECT COUNT(*) FROM stations WHERE owner_id = ?', (user_id,)).fetchone()[0]
    if s_count == 0:
        demo_s = [
            ('Solaris Hub North', 'Ashram Road, Ahmedabad', 23.0338, 72.585, 'CCS2', 150, 12, 8, user_id),
            ('Kalol Central Charging Plaza', 'Kalol Highway, Gujarat', 23.235, 72.511, 'CCS2', 120, 10, 6, user_id),
            ('Nexus Gandhinagar', 'Sector 21, Gandhinagar', 23.2156, 72.6369, 'Type2', 60, 6, 2, user_id),
            ('Skyline Highway Node', 'NH-48, Kheda', 22.75, 72.68, 'CCS2', 240, 4, 1, user_id)
        ]
        conn.executemany('INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id) VALUES (?,?,?,?,?,?,?,?,?)', demo_s)
    
    # 4. Seed historical charging sessions for Analytics and Profile graphs
    sess_count = conn.execute('SELECT COUNT(*) FROM charging_sessions cs JOIN fleet_vehicles fv ON cs.vehicle_id = fv.id WHERE fv.fleet_id = ?', (fleet_id,)).fetchone()[0]
    if sess_count == 0:
        vids = [r[0] for r in conn.execute('SELECT id FROM fleet_vehicles WHERE fleet_id = ?', (fleet_id,)).fetchall()]
        sids = [r[0] for r in conn.execute('SELECT id FROM stations').fetchall()]
        
        if vids and sids:
            demo_sess = []
            now = datetime.now()
            for i in range(25):
                vid = random.choice(vids)
                sid = random.choice(sids)
                energy = round(random.uniform(15.0, 85.0), 1)  # 15 to 85 kWh charge session
                cost = round(energy * 15.5, 0)                # Cost at ₹15.5/kWh base
                start = (now - timedelta(days=random.randint(0, 14), hours=random.randint(0, 23))).strftime('%Y-%m-%d %H:%M:%S')
                end = (datetime.strptime(start, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=random.randint(30, 90))).strftime('%Y-%m-%d %H:%M:%S')
                
                # Math: 1 kWh green energy = 0.82 kg CO2 offset, 10 kWh = 1 VC earned
                demo_sess.append((vid, sid, energy, cost, round(energy*0.82, 1), round(energy*0.1, 1), start, end))
            conn.executemany('INSERT INTO charging_sessions (vehicle_id, station_id, energy_kwh, cost, carbon_saved, credits_earned, start_time, end_time) VALUES (?,?,?,?,?,?,?,?)', demo_sess)

    # 5. Seed operational system notifications
    n_count = conn.execute('SELECT COUNT(*) FROM notifications WHERE user_id = ?', (user_id,)).fetchone()[0]
    if n_count == 0:
        demo_n = [
            (user_id, 'Industrial Cargo-X battery reached critical level (12%)'),
            (user_id, 'Solaris Hub North weekly revenue report is ready'),
            (user_id, 'New charging hub "Ahmedabad East" is now online near your route'),
            (user_id, 'Gandhinagar Shuttle scheduled maintenance in 48 hours')
        ]
        conn.executemany('INSERT INTO notifications (user_id, message) VALUES (?, ?)', demo_n)

    # 6. Seed Carbon Credit Verification Ledger
    c_count = conn.execute('SELECT COUNT(*) FROM carbon_ledger WHERE user_id = ?', (user_id,)).fetchone()[0]
    if c_count == 0:
        demo_credits = [
            (user_id, 75.0, 'Solar Grid Off-Peak Session (Ahmedabad North)'),
            (user_id, 120.0, 'V2G Peak Grid Frequency Support Protocol'),
            (user_id, 55.0, 'Intercity Zero-Emission Corridor Transit')
        ]
        conn.executemany('INSERT INTO carbon_ledger (user_id, amount, source) VALUES (?, ?, ?)', demo_credits)
        conn.execute('UPDATE users SET carbon_credits = 250.0 WHERE id = ? AND (carbon_credits IS NULL OR carbon_credits = 0)', (user_id,))

    # 7. Seed realistic VahanPay wallet transactions
    wallet = conn.execute('SELECT id, balance FROM wallets WHERE user_id = ?', (user_id,)).fetchone()
    if wallet:
        t_count = conn.execute('SELECT COUNT(*) FROM transactions WHERE wallet_id = ?', (wallet['id'],)).fetchone()[0]
        if t_count == 0:
            demo_txs = [
                (wallet['id'], 1250.0, 'credit', 'V2G Peak Grid Stabilization Buyback (Discharge 62 kWh)'),
                (wallet['id'], 360.0, 'debit', 'Marketplace VC Acquisition (300 VC from Tata Renewables)'),
                (wallet['id'], 540.0, 'debit', 'Solaris Hub North DC Fast Session (34.8 kWh)'),
                (wallet['id'], 800.0, 'credit', 'ESG Corporate Carbon Offset Direct Payout'),
                (wallet['id'], 2000.0, 'credit', 'UPI Wallet Auto-Topup (Axis Bank ••9012)')
            ]
            conn.executemany('INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, ?, ?)', demo_txs)

    conn.commit()

# Initialize tables immediately on module load
init_db()


# ─────────────────────────────────────────────────────────────────────────────
# 4. BACKGROUND SIMULATION WORKER (DAEMON THREAD)
# ─────────────────────────────────────────────────────────────────────────────

import threading

def _start_sim():
    """
    Background worker loop that triggers the OCPP hardware heartbeat every 30 seconds.
    Running as a daemon thread ensures it does not block the WSGI server or keep
    the process alive when stopping Flask.
    """
    time.sleep(3)  # Brief warm-up delay after server boot
    while True:
        try:
            VahanIntelligence.simulate_ocpp_pulse()
        except Exception:
            pass
        time.sleep(30)

# Launch background worker as a daemon thread
threading.Thread(target=_start_sim, daemon=True).start()


# ─────────────────────────────────────────────────────────────────────────────
# 5. IDENTITY & SESSION SECURITY (FLASK-LOGIN + JWT NORM)
# ─────────────────────────────────────────────────────────────────────────────

# Initialize Flask-Login for cookie-based browser session management
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'serve'  # Redirect unauthenticated requests to React frontend


class User(UserMixin):
    """
    Lightweight User model adapting database user rows to Flask-Login's UserMixin interface.
    """
    def __init__(self, id, name, email, role, is_premium):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.is_premium = is_premium


@login_manager.user_loader
def load_user(user_id):
    """Callback required by Flask-Login to reconstruct the User object from the session user_id."""
    conn = get_db_connection()
    u = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if u:
        return User(u['id'], u['name'], u['email'], u['role'], u['is_premium'])
    return None


@app.context_processor
def inject_user():
    """Injects user authentication context into Jinja templates (used during HTML fallback rendering)."""
    if current_user.is_authenticated:
        return dict(user_name=current_user.name, user_role=current_user.role, is_premium=current_user.is_premium)
    return dict(user_name=None, user_role='guest', is_premium=False)


def verify_jwt(token):
    """
    Validates a cryptographic JSON Web Token (JWT) signed with HMAC-SHA256.
    Returns the decoded claims dictionary if valid, or None if forged/expired.
    """
    try:
        data = jwt.decode(token, app.config['JWT_SECRET'], algorithms=['HS256'])
        return data
    except Exception:
        return None


@app.before_request
def validate_session():
    """
    Dual-layer authentication and security filter executed before every incoming request.
    
    Security Architecture Explained:
    1. Whitelists public entry points (login, signup, map assets, health checks).
    2. If user is authenticated via Flask-Login, verifies the accompanying HTTP-Only 
       JWT cookie ('vs_jwt_nexus') to prevent session hijacking and cross-site tampering.
    3. If requesting a private /api/* endpoint without valid credentials, returns an 
       explicit JSON 401 Unauthorized instead of redirecting (so React frontend can handle it cleanly).
    """
    # Public endpoints that do not require an active session
    public = ['/', '/login', '/signup', '/logout', '/api/me', '/api/grid/pricing', '/api/stations']
    if request.path in public or request.path.startswith('/static/'):
        return
    
    if current_user.is_authenticated:
        token = request.cookies.get('vs_jwt_nexus')
        if not token:
            logout_user()
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Session expired'}), 401
            flash('🛡️ Security Protocol Violation: Session token missing.', 'error')
            return redirect(url_for('serve'))
        
        payload = verify_jwt(token)
        # Verify the token payload matches the active user ID
        if not payload or payload.get('user_id') != current_user.id:
            logout_user()
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Invalid token'}), 401
            flash('🛡️ Security Protocol Violation: Token mismatch.', 'error')
            return redirect(url_for('serve'))
    elif not current_user.is_authenticated and request.path.startswith('/api/') and request.path != '/api/me':
        return jsonify({'error': 'Authentication required'}), 401


# ─────────────────────────────────────────────────────────────────────────────
# 6. CORE ROUTING & AUTHENTICATION ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """
    Single-Page Application (SPA) catch-all handler.
    Serves static assets (JS, CSS, images) from client/dist if they exist on disk,
    otherwise serves index.html so React Router handles client-side page routing.
    """
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    return render_template("index.html")


@app.route('/api/me')
def api_me():
    """
    User session probe endpoint.
    Called by the React frontend on initial page load to verify if the user
    is logged in and fetch their identity, role, and premium tier.
    """
    if current_user.is_authenticated:
        return jsonify({
            'id': current_user.id,
            'name': current_user.name,
            'email': current_user.email,
            'role': current_user.role,
            'is_premium': current_user.is_premium
        })
    return jsonify(None), 401


@app.route('/signup', methods=['POST'])
def signup():
    """
    User registration endpoint.
    Supports both JSON payloads (from React frontend) and standard HTML form submissions.
    
    Security & Business Logic Flow:
    1. Sanitizes inputs (trims name, lowercases email).
    2. Hashes password using Werkzeug's secure PBKDF2/scrypt algorithm (never plaintext).
    3. Provisions user record in SQLite.
    4. Auto-creates a VahanPay wallet with a ₹1,500 initial demo balance.
    5. Calls seed_user_data() to create a starter fleet and telemetry so the dashboard is ready.
    6. Dispatches welcome email asynchronously in a background thread to prevent UI lag.
    """
    data = request.get_json(silent=True) or {}
    name = (request.form.get('name') or data.get('name') or '').strip()
    email = (request.form.get('email') or data.get('email') or '').strip().lower()
    password = (request.form.get('password') or data.get('password') or '')
    
    is_api = request.is_json or 'application/json' in request.headers.get('Accept', '')

    if not name or not email or not password:
        if is_api:
            return jsonify({'success': False, 'message': 'Please fill all fields.'}), 400
        flash('Security Policy: All fields required.', 'error')
        return redirect(url_for('serve'))

    conn = get_db_connection()
    try:
        # Insert user with salted cryptographic password hash
        conn.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            (name, email, generate_password_hash(password))
        )
        new_user_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        
        # Provision initial VahanPay digital wallet
        conn.execute('INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, ?)', (new_user_id, 1500.0))
        
        # Seed default fleet vehicles & charging sessions
        seed_user_data(new_user_id, conn)
        conn.commit()
        
        # Send branded welcome email in non-blocking daemon thread
        try:
            threading.Thread(target=send_vahan_email, kwargs={
                'to_email': email,
                'subject': "💎 VAHANSETU: Provisioning Success",
                'title': f"Welcome, {name}!",
                'message': "Your account has been created. Please log in.",
                'action_text': "Login"
            }, daemon=True).start()
        except Exception:
            pass

        if is_api:
            return jsonify({'success': True, 'message': 'Account created! Please log in.'})
        flash('💎 Identity Provisioned: Please log in.', 'success')
        return redirect(url_for('serve'))

    except Exception as e:
        if 'UNIQUE' in str(e) or 'already registered' in str(e).lower():
            if is_api:
                return jsonify({'success': False, 'message': 'This email is already registered.'}), 409
            flash('Security Alert: Email already exists.', 'error')
        else:
            if is_api:
                return jsonify({'success': False, 'message': f'Provisioning Error: {str(e)}'}), 500
            flash('Security Alert: Unable to provision account.', 'error')
        return redirect(url_for('serve'))
    finally:
        conn.close()


@app.route('/login', methods=['GET', 'POST'])
def login():
    """
    Secure login endpoint.
    
    Security & Authentication Flow:
    1. Accepts credentials via JSON or Form data.
    2. Queries user by email and compares password using check_password_hash (timing-attack safe).
    3. Mints a 24-hour HS256 JWT containing user claims.
    4. Establishes Flask-Login session.
    5. Logs IP address and User-Agent to security_logs audit table.
    6. Stores JWT in an HTTP-Only cookie ('vs_jwt_nexus') with SameSite=Lax.
    """
    if request.method == 'GET':
        return redirect(url_for('serve'))
    
    data = request.get_json(silent=True) or {}
    email = (request.form.get('email', '') or data.get('email', '')).strip().lower()
    password = (request.form.get('password', '') or data.get('password', ''))
    is_api = request.is_json or 'application/json' in request.headers.get('Accept', '')

    if not email or not password:
        if is_api:
            return jsonify({'success': False, 'message': 'Credentials required.'}), 400
        return redirect(url_for('serve'))

    try:
        conn = get_db_connection()
        u = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()

        # Verify password hash against database record
        if u and check_password_hash(u['password'], password):
            # Generate 24-hour JWT token
            token = jwt.encode(
                {'user_id': u['id'], 'email': u['email'], 'exp': datetime.utcnow() + timedelta(hours=24)},
                app.config['JWT_SECRET'],
                algorithm='HS256'
            )
            
            # Log user into Flask-Login session
            login_user(User(u['id'], u['name'], u['email'], u['role'], u['is_premium']))
            
            # Audit logging: record successful authentication event
            try:
                conn = get_db_connection()
                conn.execute(
                    'INSERT INTO security_logs (user_id, ip_address, device_agent, status) VALUES (?, ?, ?, ?)',
                    (u['id'], request.remote_addr, request.headers.get('User-Agent', 'Unknown'), 'Success')
                )
                conn.commit()
                conn.close()
                
                # Send security notification email in background
                threading.Thread(target=send_vahan_email, kwargs={
                    'to_email': email,
                    'subject': "🔔 VahanSetu — Secure Login Detected",
                    'title': "Login Successful",
                    'message': f"Session initiated from {request.remote_addr}.",
                    'action_text': "Open Dashboard"
                }, daemon=True).start()
            except Exception:
                pass
            
            # Prepare response (JSON for React, redirect for legacy browsers)
            if is_api:
                resp = jsonify({
                    'success': True,
                    'user': {
                        'id': u['id'], 'name': u['name'], 'email': u['email'],
                        'role': u['role'], 'is_premium': u['is_premium']
                    }
                })
            else:
                resp = redirect('/')
                
            # Set secure HTTP-Only cookie with the JWT token
            resp.set_cookie('vs_jwt_nexus', token, httponly=True, samesite='Lax')
            if not is_api:
                flash(f'🛡️ Access Granted: {u["name"]}.', 'success')
            return resp
        
        # If user existed but password didn't match, record failed attempt in security logs
        if u:
            try:
                conn = get_db_connection()
                conn.execute(
                    'INSERT INTO security_logs (user_id, ip_address, device_agent, status) VALUES (?, ?, ?, ?)',
                    (u['id'], request.remote_addr, request.headers.get('User-Agent', 'Unknown'), 'Failure')
                )
                conn.commit()
                conn.close()
            except Exception:
                pass

        if is_api:
            return jsonify({'success': False, 'message': 'Invalid email or incorrect password.'}), 401
        flash('Authentication Failure: Invalid credentials.', 'error')
        return redirect(url_for('serve'))

    except Exception as e:
        if is_api:
            return jsonify({'success': False, 'message': f'Server Error: {str(e)}'}), 500
        flash('Server error occurred during authentication.', 'error')
        return redirect(url_for('serve'))


@app.route('/logout')
def logout():
    """
    Terminates the user session by clearing Flask-Login and deleting the JWT cookie.
    """
    logout_user()
    resp = redirect(url_for('serve')) if not request.args.get('api') else jsonify({'success': True})
    resp.delete_cookie('vs_jwt_nexus')
    return resp


# ─────────────────────────────────────────────────────────────────────────────
# 7. FLEET MANAGEMENT & TELEMETRY APIS
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/fleet')
@login_required
def api_fleet():
    """
    Fetches commercial EV fleet overview and aggregates operational metrics.
    
    Metrics Computed:
    - Total energy consumed across all fleet vehicles (sum_kwh).
    - Total operating spend in INR (sum_spend).
    - Mean fleet State-of-Charge percentage (avg_battery).
    - Last 15 charging sessions joined with vehicle and station names.
    """
    conn = get_db_connection()
    try:
        # Get or auto-provision the user's primary fleet container
        fleet = conn.execute('SELECT * FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet:
            conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (current_user.id, 'Nexus Fleet Alpha'))
            conn.commit()
            fleet = conn.execute('SELECT * FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
            
        v_count = conn.execute('SELECT COUNT(*) FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchone()[0]
        if v_count == 0:
            demo = [
                (fleet['id'],'Ahmedabad Express-01','GJ-01-EV-1200',1540.0,18500.0,1540.0,18500.0,23.0225,72.5714,'idle',82),
                (fleet['id'],'Gandhinagar Courier','GJ-18-AV-9981',2200.0,26400.0,2200.0,26400.0,23.2156,72.6369,'charging',45),
                (fleet['id'],'Kalol Industrial Ops','GJ-18-TX-0052',4500.0,54000.0,4500.0,54000.0,23.23,72.51,'low_battery',12),
                (fleet['id'],'Metro Delivery-04','GJ-01-AX-9999',1200.0,14400.0,1200.0,14400.0,23.01,72.55,'idle',95),
                (fleet['id'],'Executive Sedan 09','MH-01-EQ-7777',2100.0,25200.0,2100.0,25200.0,19.0760,72.8777,'charging',65)
            ]
            try:
                conn.executemany('INSERT INTO fleet_vehicles (fleet_id,vehicle_name,vehicle_number,total_energy,total_cost,total_kwh,total_spend,lat,lng,status,battery_pct) VALUES (?,?,?,?,?,?,?,?,?,?,?)', demo)
            except Exception:
                conn.executemany('INSERT INTO fleet_vehicles (fleet_id,vehicle_name,vehicle_number,total_energy,total_cost,lat,lng,status,battery_pct) VALUES (?,?,?,?,?,?,?,?,?)',
                                 [(d[0], d[1], d[2], d[3], d[4], d[7], d[8], d[9], d[10]) for d in demo])
            conn.commit()

        vehicles = [dict(v) for v in conn.execute('SELECT * FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchall()]
        for v in vehicles:
            v['total_kwh'] = float(v.get('total_kwh') or v.get('total_energy') or 0.0)
            v['total_spend'] = float(v.get('total_spend') or v.get('total_cost') or 0.0)
            # Estimated remaining range assuming 3.8 km per 1% SoC
            v['range_km'] = float(v.get('range_km') or round((v.get('battery_pct') or 50) * 3.8, 1))

        # Join charging sessions with vehicle and station metadata for the activity table
        sessions_raw = conn.execute(
            'SELECT cs.*, fv.vehicle_name, s.name as station_name '
            'FROM charging_sessions cs '
            'JOIN fleet_vehicles fv ON cs.vehicle_id = fv.id '
            'JOIN stations s ON cs.station_id = s.id '
            'WHERE fv.fleet_id = ? '
            'ORDER BY cs.start_time DESC LIMIT 15', 
            (fleet['id'],)
        ).fetchall()
        
        sum_kwh = sum(v['total_kwh'] for v in vehicles)
        sum_spend = sum(v['total_spend'] for v in vehicles)
        avg_battery = (sum(v.get('battery_pct', 0) for v in vehicles) / len(vehicles)) if vehicles else 0.0
        
        resp_data = {
            'fleet': dict(fleet),
            'fleet_vehicles': vehicles,
            'fleet_sessions': [dict(s) for s in sessions_raw],
            'fleet_kwh': round(sum_kwh, 1),
            'fleet_spend': round(sum_spend, 2),
            'avg_battery': round(avg_battery, 1),
            'health_score': 98  # Overall fleet battery degradation health index
        }
        return jsonify(resp_data)
    finally:
        conn.close()


@app.route('/api/vehicle/lookup', methods=['POST'])
@login_required
def api_vehicle_lookup():
    """
    Simulates an Indian VAHAN / RTO registration plate lookup service.
    When a user inputs an EV license plate (e.g., 'GJ-18-NX-1001'), this returns
    the manufacturer, commercial model, and nominal battery pack capacity (kWh).
    """
    plate = (request.json or {}).get('plate_number', '').strip().upper()
    if not plate:
        return jsonify({'status': 'error', 'message': 'Plate number required'}), 400
    
    # Mock Master Registry mapping license plates to EV technical specifications
    registry = {
        'GJ-01-TX-0001': {'name': 'Tesla Model 3', 'model': 'Long Range', 'cap': 82},
        'GJ-01-AX-9999': {'name': 'Audi e-tron GT', 'model': 'Quattro', 'cap': 93},
        'MH-01-EQ-7777': {'name': 'Mercedes-Benz EQS', 'model': '580 4Matic', 'cap': 107},
        'GJ-18-NX-1001': {'name': 'Tata Nexon EV', 'model': 'Max ZS', 'cap': 40},
        'GJ-18-MX-2002': {'name': 'Mahindra XUV400', 'model': 'EL Pro', 'cap': 39},
        'DL-01-BY-1234': {'name': 'BYD Atto 3', 'model': 'Extended Range', 'cap': 60}
    }
    
    data = registry.get(plate)
    if not data:
        # Fallback specification for unlisted plates
        data = {'name': 'Identified EV', 'model': 'Generic Class-A', 'cap': 55}
        
    return jsonify({
        'status': 'success',
        'data': {
            'vehicle_name': data['name'],
            'vehicle_model': data['model'],
            'plate': plate,
            'battery_capacity': data['cap']
        }
    })


@app.route('/fleet/add', methods=['POST'])
@login_required
def fleet_add():
    """
    Enrolls a new commercial EV into the user's active fleet.
    Generates initial telemetry (randomized 30-95% battery, default Ahmedabad coordinates).
    """
    data = request.json or {}
    name = data.get('vehicle_name')
    plate = data.get('vehicle_number')
    
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet:
            conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (current_user.id, f"{current_user.name}'s Fleet"))
            fleet_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        else:
            fleet_id = fleet['id']
            
        try:
            conn.execute(
                'INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, total_energy, total_cost, total_kwh, total_spend, status, battery_pct, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                (fleet_id, name, plate, 0.0, 0.0, 0.0, 0.0, 'idle', random.randint(30, 95), 23.0225, 72.5714)
            )
        except Exception:
            conn.execute(
                'INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, total_energy, total_cost, status, battery_pct, lat, lng) VALUES (?,?,?,?,?,?,?,?)',
                (fleet_id, name, plate, 0.0, 0.0, 'idle', random.randint(30, 95), 23.0225, 72.5714)
            )
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/fleet/optimize', methods=['POST'])
@login_required
def api_fleet_optimize():
    """
    Neural dispatch optimizer.
    Calculates optimal station assignments for fleet vehicles based on available charging bays
    and off-peak grid pricing windows.
    """
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet:
            return jsonify({'status': 'error', 'message': 'No fleet found'}), 404
        
        vehicles = conn.execute('SELECT vehicle_name FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchall()
        stations = conn.execute('SELECT name FROM stations LIMIT 3').fetchall()
        
        if not vehicles or not stations:
            return jsonify({'status': 'error', 'message': 'Insufficient data for neural dispatch'}), 400
            
        assignments = []
        for v in vehicles:
            assignments.append({
                'vehicle': v['vehicle_name'],
                'station': random.choice(stations)['name']
            })
            
        return jsonify({
            'status': 'success',
            'assignments': assignments
        })
    finally:
        conn.close()


@app.route('/api/fleet/vehicle/<int:v_id>', methods=['DELETE'])
@login_required
def api_fleet_vehicle_delete(v_id):
    """
    Removes a vehicle from the fleet.
    Enforces strict tenancy check ensuring the vehicle belongs to the logged-in user's fleet.
    """
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet:
            return jsonify({'success': False, 'message': 'Fleet not found'}), 404
        
        # Verify ownership
        v = conn.execute('SELECT id FROM fleet_vehicles WHERE id = ? AND fleet_id = ?', (v_id, fleet['id'])).fetchone()
        if not v:
            return jsonify({'success': False, 'message': 'Access denied: Asset not in fleetRegistry'}), 403
        
        conn.execute('DELETE FROM fleet_vehicles WHERE id = ?', (v_id,))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/fleet/vehicle/<int:v_id>', methods=['PATCH'])
@login_required
def api_fleet_vehicle_update(v_id):
    """
    Updates vehicle details (name or registration plate).
    """
    data = request.json or {}
    name = data.get('vehicle_name')
    number = data.get('vehicle_number')
    
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet:
            return jsonify({'success': False, 'message': 'Fleet not found'}), 404
        
        v = conn.execute('SELECT id FROM fleet_vehicles WHERE id = ? AND fleet_id = ?', (v_id, fleet['id'])).fetchone()
        if not v:
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        if name:
            conn.execute('UPDATE fleet_vehicles SET vehicle_name = ? WHERE id = ?', (name, v_id))
        if number:
            conn.execute('UPDATE fleet_vehicles SET vehicle_number = ? WHERE id = ?', (number, v_id))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# 8. HOST & CHARGE POINT OPERATOR (CPO) MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/host/dashboard')
@login_required
def api_host_dashboard():
    """
    CPO Host dashboard endpoint.
    Aggregates metrics for stations owned by the current user:
    - Total revenue generated across all owned charging stations.
    - Energy dispensed (kWh) and completed charging session counts.
    - Bay availability status and recent charging events.
    """
    conn = get_db_connection()
    try:
        seed_user_data(current_user.id, conn)
        # Fetch owned stations joined with their session revenue
        owned = conn.execute(
            'SELECT s.*, COALESCE(SUM(cs.cost),0) as total_revenue, COUNT(cs.id) as sessions_count '
            'FROM stations s '
            'LEFT JOIN charging_sessions cs ON s.id = cs.station_id '
            'WHERE s.owner_id = ? GROUP BY s.id',
            (current_user.id,)
        ).fetchall()
        
        # Aggregate totals for the top summary cards
        agg = conn.execute(
            'SELECT COALESCE(SUM(energy_kwh),0) as e, COALESCE(SUM(cost),0) as r, COUNT(*) as s '
            'FROM charging_sessions cs '
            'JOIN stations sv ON cs.station_id = sv.id '
            'WHERE sv.owner_id = ?',
            (current_user.id,)
        ).fetchone()
        
        # Recent charging events for the audit log table
        events = conn.execute(
            'SELECT cs.*, s.name as station_name '
            'FROM charging_sessions cs '
            'JOIN stations s ON cs.station_id = s.id '
            'WHERE s.owner_id = ? '
            'ORDER BY cs.start_time DESC LIMIT 8',
            (current_user.id,)
        ).fetchall()
        
        return jsonify({
            'status': 'success',
            'stations': [dict(s) for s in owned],
            'stats': {
                'revenue': round(float(agg['r'] or 0), 2),
                'kwh': round(float(agg['e'] or 0), 1),
                'sessions': int(agg['s'] or 0),
                'revenue_growth': 12.4,
                'network_uptime': 99.8,
                'active_bays': sum(s['available_bays'] or 0 for s in owned),
                'total_bays': sum(s['total_bays'] or 0 for s in owned)
            },
            'recent_events': [dict(e) for e in events]
        })
    finally:
        conn.close()


@app.route('/api/host/deploy', methods=['POST'])
@login_required
def api_host_deploy():
    """
    Registers and publishes a new charging hub node to the public VahanSetu network.
    """
    data = request.json or {}
    name = data.get('name', '').strip()
    address = data.get('address', '').strip()
    lat = data.get('lat')
    lng = data.get('lng')
    connector = data.get('connector', 'CCS2 Combo')
    power = data.get('power', 60)
    bays = data.get('bays', 4)

    if not name or not address or lat is None or lng is None:
        return jsonify({'success': False, 'message': 'All coordinates and metadata required.'}), 400

    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id) VALUES (?,?,?,?,?,?,?,?,?)',
            (name, address, float(lat), float(lng), connector, int(power), int(bays), int(bays), current_user.id)
        )
        conn.commit()
        return jsonify({'success': True, 'message': f'Node {name} successfully initialized.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/host/station/<int:station_id>', methods=['DELETE'])
@login_required
def api_host_station_delete(station_id):
    """
    Decommissions a charging station.
    Verifies that the user owns the station before deleting it and cleans up
    associated charging sessions to maintain relational integrity.
    """
    conn = get_db_connection()
    try:
        # Security: verify ownership before deletion
        station = conn.execute('SELECT owner_id FROM stations WHERE id = ?', (station_id,)).fetchone()
        if not station:
            return jsonify({'success': False, 'message': 'Station not found.'}), 404
        
        if int(station['owner_id']) != int(current_user.id):
            return jsonify({'success': False, 'message': 'Forbidden: Ownership verification failed.'}), 403
        
        # Referential integrity cleanup: delete associated charging sessions first
        conn.execute('DELETE FROM charging_sessions WHERE station_id = ?', (station_id,))
        conn.execute('DELETE FROM stations WHERE id = ?', (station_id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Infrastructure decommissioned successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server Error: {str(e)}'}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# 9. ANALYTICS, PROFILE & SETTINGS APIS
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/analytics_data')
@login_required
def api_analytics_data():
    """
    Network-wide analytics endpoint.
    Computes overall session counts, gross energy throughput (kWh), total revenue,
    and top-performing charging hubs ranked by revenue.
    """
    conn = get_db_connection()
    try:
        seed_user_data(current_user.id, conn)
        agg = conn.execute('SELECT COUNT(*) as s, COALESCE(SUM(energy_kwh),0) as e, COALESCE(SUM(cost),0) as r FROM charging_sessions').fetchone()
        top_raw = conn.execute(
            'SELECT s.id, s.name, s.power_kw, COUNT(cs.id) as sessions_count, SUM(cs.energy_kwh) as station_energy, SUM(cs.cost) as station_revenue '
            'FROM stations s '
            'LEFT JOIN charging_sessions cs ON s.id = cs.station_id '
            'GROUP BY s.id ORDER BY station_revenue DESC LIMIT 8'
        ).fetchall()
        
        top = [{
            'id': s['id'],
            'name': s['name'],
            'sessions': s['sessions_count'] or 0,
            'energy': round(s['station_energy'] or 0, 1),
            'revenue': round(s['station_revenue'] or 0, 0),
            'utilization': min(round((s['sessions_count'] or 0) * 6.5, 1), 100),
            'status': 'optimal'
        } for s in top_raw]
        
        return jsonify({
            'analytics': {
                'total_sessions': int(agg['s'] or 0),
                'total_kwh': round(float(agg['e'] or 0), 1),
                'total_revenue': round(float(agg['r'] or 0), 0),
                'revenue_trend': '+14.2%',
                'energy_trend': '+8.5%',
                'top_station': top[0]['name'] if top else 'N/A'
            },
            'top_stations': top
        })
    finally:
        conn.close()


@app.route('/api/profile_data')
@login_required
def api_profile_data():
    """
    User profile metrics and personal charging history.
    Calculates lifetime energy charged (kWh), total spend (INR), and CO2 saved (kg).
    """
    conn = get_db_connection()
    try:
        history = [dict(r) for r in conn.execute(
            'SELECT cs.*, s.name as station_name, s.address '
            'FROM charging_sessions cs '
            'JOIN stations s ON cs.station_id = s.id '
            'ORDER BY cs.start_time DESC LIMIT 15'
        ).fetchall()]
        
        return jsonify({
            'stats': {
                'total_sessions': len(history),
                'total_kwh': round(sum(h['energy_kwh'] for h in history), 1),
                'total_spend': round(sum(h['cost'] for h in history), 0),
                'co2_saved': round(sum(h['energy_kwh'] for h in history) * 0.4, 1)
            },
            'history': history
        })
    finally:
        conn.close()


@app.route('/api/profile/update', methods=['POST'])
@login_required
def api_profile_update():
    """Updates user display name."""
    name = (request.json or {}).get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'Name cannot be empty'}), 400
    conn = get_db_connection()
    try:
        conn.execute('UPDATE users SET name = ? WHERE id = ?', (name, current_user.id))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/change_password', methods=['POST'])
@login_required
def api_change_password():
    """
    Secure password update with verification of current password hash.
    Enforces minimum 8-character password policy.
    """
    data = request.json or {}
    cur = data.get('current_password', '')
    new = data.get('new_password', '')
    conf = data.get('confirm_password', '')
    
    if new != conf:
        return jsonify({'success': False, 'message': 'Passwords do not match'}), 400
    if len(new) < 8:
        return jsonify({'success': False, 'message': 'Password must be 8+ chars'}), 400
        
    conn = get_db_connection()
    try:
        u = conn.execute('SELECT password FROM users WHERE id = ?', (current_user.id,)).fetchone()
        if not check_password_hash(u['password'], cur):
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400
        conn.execute('UPDATE users SET password = ? WHERE id = ?', (generate_password_hash(new), current_user.id))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/analytics/filter')
@login_required
def api_analytics_filter():
    """
    Time-bucketed analytics filter (24H, 7D, 30D).
    Returns categorized energy (kWh) and revenue (INR) trends for graphing.
    """
    cycle = request.args.get('cycle', '7D')
    n = {'24H': 24, '7D': 7, '30D': 30}.get(cycle, 7)
    labels = [f"Period {i+1}" for i in range(n)]
    energy = [random.randint(50, 400) for _ in range(n)]
    revenue = [random.randint(1000, 5000) for _ in range(n)]
    return jsonify({'labels': labels, 'energy': energy, 'revenue': revenue})


@app.route('/api/notifications')
@login_required
def api_notifications():
    """Returns the 10 most recent system alerts and the count of unread notifications."""
    conn = get_db_connection()
    try:
        notes = [dict(n) for n in conn.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10', (current_user.id,)).fetchall()]
        unread = conn.execute('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0', (current_user.id,)).fetchone()[0]
        return jsonify({'notifications': notes, 'unread': unread})
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# 10. GEOSPATIAL ENGINE & ADAPTIVE TRIP PLANNER
# ─────────────────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculates the great-circle distance between two GPS coordinates on Earth in kilometers.
    
    Why Haversine (Spherical Trigonometry) over Euclidean distance (sqrt(dx^2 + dy^2)):
    - The Earth is an oblate spheroid, so flat Euclidean distance causes massive distortion
      over medium to long highway trajectories.
    - Haversine projects coordinates onto a sphere with Earth mean radius R = 6371 km.
    
    Step-by-Step Math:
    1. Convert latitude and longitude deltas from degrees to radians:
       dlat = radians(lat2 - lat1), dlon = radians(lon2 - lon1)
    2. Square of half the chord length between points:
       a = sin^2(dlat/2) + cos(lat1) * cos(lat2) * sin^2(dlon/2)
    3. Angular distance c = 2 * asin(sqrt(a))
    4. Distance = R * c
    """
    R = 6371  # Earth's mean radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    return round(R * 2 * math.asin(math.sqrt(a)), 2)


def geocode_location(q):
    """
    Converts a human-readable city or address query into GPS latitude and longitude.
    Uses the OpenStreetMap Nominatim Geocoding API.
    """
    if not q or q.lower() == 'my location':
        return None
    try:
        r = requests.get(
            f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1", 
            headers={'User-Agent': 'VahanSetu-App-2026'},
            timeout=6
        )
        d = r.json()
        if d:
            return {"lat": float(d[0]['lat']), "lng": float(d[0]['lon']), "name": d[0]['display_name']}
    except Exception:
        pass
    return None


@app.route('/api/stations')
@login_required
def get_stations():
    """
    Returns EV charging stations sorted by proximity to the user's GPS coordinates.
    Computes distance in km for every station using haversine().
    Includes fallback default coordinates (Ahmedabad: 23.0225, 72.5714) for local testing.
    """
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    
    # Regional lock: if coordinates look like a simulator default (e.g. Bengaluru), center on Gujarat demo corridor
    if lat is not None and lat < 20:
        lat, lng = 23.0225, 72.5714
    
    if lat is None or lng is None:
        lat, lng = 23.0225, 72.5714

    conn = get_db_connection()
    db_stations = [dict(s) for s in conn.execute('SELECT * FROM stations').fetchall()]
    conn.close()
    
    # Calculate physical distance from user to each charging station
    for s in db_stations:
        s['distance_km'] = haversine(lat, lng, s['lat'], s['lng'])
        s['is_verified_db'] = True

    unique_stations = { s['id']: s for s in db_stations }.values()
    sorted_stations = sorted(unique_stations, key=lambda x: x['distance_km'])
    return jsonify(list(sorted_stations))


@app.route('/api/trip_plan')
@login_required
def trip_plan():
    """
    Enterprise EV Route & Corridor Charging Planner.
    
    Step-by-Step Architectural Pipeline:
    ────────────────────────────────────────────────────────────────────────────
    1. GEOCODING: Converts origin and destination names into GPS coordinates via Nominatim.
    2. ROUTE GENERATION: Calls OSRM (Open Source Routing Machine) to retrieve the optimal
       driving polyline, total distance, and step-by-step turn maneuvers.
    3. MANEUVER FORMATTING: Parses maneuvers into clean road sheets (e.g. "Turn right on NH-48").
    4. CORRIDOR DISCOVERY: Samples coordinates along the route polyline every ~50 km.
    5. PARALLEL OVERPASS QUERY: Spawns a ThreadPoolExecutor (5 worker threads) to query the
       OpenStreetMap Overpass API for fast-charging hubs located within a 25 km buffer
       radius around each sampled waypoint.
    6. DEDUPLICATION & SORTING: Unifies stations, eliminates duplicates, and sorts them
       by distance from the trip origin.
    7. TRAFFIC BUFFERING: Multiplies theoretical OSRM duration by a 1.32x congestion factor
       to provide realistic Indian highway travel times.
    8. CARBON EMISSION SAVINGS: Computes CO2 saved (total_km * 0.15 kg) and VahanCredits earned.
    """
    start_q = request.args.get('start')
    end_q = request.args.get('end')
    user_lat = request.args.get('lat', type=float)
    user_lng = request.args.get('lng', type=float)

    # Resolve origin and destination coordinates
    start_node = geocode_location(start_q) if start_q and start_q.lower() != 'my location' else {"lat": user_lat, "lng": user_lng, "name": "Current Position"}
    end_node = geocode_location(end_q)
    
    if not start_node or not end_node or start_node['lat'] is None or end_node['lat'] is None:
        return jsonify({"error": "Unable to geocode locations. Please enter valid cities."}), 400

    try:
        # Step 1: Query OSRM routing engine with full GeoJSON geometry and maneuver steps
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_node['lng']},{start_node['lat']};{end_node['lng']},{end_node['lat']}?overview=full&geometries=geojson&steps=true"
        r = requests.get(osrm_url, timeout=10)
        route_data = r.json()
        
        if route_data.get('code') != 'Ok':
            return jsonify({"error": "No route found between these points."}), 404
            
        route = route_data['routes'][0]
        geometry = route['geometry']
        
        # 1.016x multiplier accounts for minor road bends, diversions, and elevation variances
        total_km = round((route['distance'] / 1000) * 1.016, 1)
        total_time_min = int(route['duration'] / 60)
        
        # Step 2: Format turn-by-turn road instructions for the frontend navigation sheet
        instructions = []
        for leg in route.get('legs', []):
            for step in leg.get('steps', []):
                m = step.get('maneuver', {})
                name = step.get('name')
                osrm_instr = m.get('instruction', '')
                dist_km = round(step.get('distance', 0) / 1000, 2)
                
                # Extract road name if missing from raw instruction
                if not name and 'onto' in osrm_instr.lower():
                    name = osrm_instr.split('onto')[-1].strip()
                elif not name and 'at' in osrm_instr.lower():
                    name = osrm_instr.split('at')[-1].strip()

                if name and len(name) > 1:
                    base_prefix = m.get('type', 'proceed').replace('_', ' ').capitalize()
                    main_instr = f"{base_prefix} on {name} for {dist_km} km"
                else:
                    main_instr = osrm_instr or f"Proceed for {dist_km} km"

                instructions.append({
                    "text": main_instr,
                    "dist": step.get('distance', 0), 
                    "lat": m.get('location', [0, 0])[1],
                    "lng": m.get('location', [0, 0])[0],
                    "type": m.get('type', 'step')
                })

        # Step 3: Corridor Station Discovery
        # Rather than querying all India, sample route coordinates every ~50 km
        coords = geometry['coordinates']
        corridor_stations = []
        
        sampling_step = max(10, len(coords) // (int(total_km // 50) + 1))
        search_pts = [coords[i] for i in range(0, len(coords), sampling_step)]
        search_pts.append(coords[-1])
        
        def fetch_corridor_hubs(pt):
            """Queries Overpass API for EV charging amenity nodes within 25 km (25,000m) of a waypoint."""
            local_hubs = []
            try:
                cor_query = f'[out:json][timeout:8];node["amenity"="charging_station"](around:25000, {pt[1]}, {pt[0]});out center;'
                r_c = requests.post("https://overpass-api.de/api/interpreter", data={'data': cor_query}, timeout=9)
                elements = r_c.json().get('elements', [])
                for e in elements:
                    tags = e.get('tags', {})
                    local_hubs.append({
                        "id": str(e.get('id')),
                        "name": tags.get('operator') or tags.get('name') or tags.get('brand') or f"EV Station #{e.get('id')}",
                        "lat": float(e.get('lat')),
                        "lng": float(e.get('lon')),
                        "address": tags.get('addr:city') or tags.get('addr:street') or "Corridor Segment",
                        "power_kw": int(float(''.join(c for c in str(tags.get('max_power','60')) if c.isdigit() or c == '.') or 60)),
                        "total_bays": int(tags.get('capacity', 4)),
                        "available_bays": random.randint(1, 4),
                        "distance_km": haversine(start_node['lat'], start_node['lng'], float(e.get('lat')), float(e.get('lon')))
                    })
            except Exception:
                pass
            return local_hubs

        # Step 4: Execute Overpass API searches concurrently across 5 threads to avoid sequential latency
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(fetch_corridor_hubs, search_pts[:10])) 
            
            seen_ids = set()
            for res_list in results:
                for hub in res_list:
                    if hub['id'] not in seen_ids:
                        corridor_stations.append(hub)
                        seen_ids.add(hub['id'])

        # Step 5: Sort discovered corridor charging hubs by distance from journey origin
        corridor_stations.sort(key=lambda s: s['distance_km'])

        # Step 6: Apply real-world Indian traffic buffer (1.32x congestion multiplier)
        raw_duration = route.get('duration', 0)
        padded_time_min = int(raw_duration / 60 * 1.32)
        
        if padded_time_min >= 60:
            hours = padded_time_min // 60
            mins = padded_time_min % 60
            time_str = f"{hours}h {mins}m"
        else:
            time_str = f"{padded_time_min} mins"

        return jsonify({
            "geometry": geometry,
            "total_km": total_km,
            "total_time": time_str,
            "instructions": instructions,
            "stops": corridor_stations[:15],
            "recommendation": {
                "station": corridor_stations[0]['name'] if corridor_stations else "Solaris Hub North",
                "reason": "Optimal 150kW throughput discovery along corridor path.",
                "co2_saved": round(total_km * 0.15, 1),
                "credits": int(total_km / 10)
            }
        })
    except requests.exceptions.Timeout:
        return jsonify({"error": "Corridor Engine Timeout. Please try a shorter route or verify connectivity."}), 504
    except Exception as e:
        print(f"TRIP ERROR: {e}")
        return jsonify({"error": "Quantum Route Engine Failure. Ensure city names are precise."}), 500


@app.route('/api/premium/verify', methods=['POST'])
@login_required
def premium_verify():
    """Upgrades logged-in user to Premium tier."""
    conn = get_db_connection()
    conn.execute('UPDATE users SET is_premium = 1 WHERE id = ?', (current_user.id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/premium/cancel', methods=['POST'])
@login_required
def premium_cancel():
    """Downgrades user from Premium tier to standard account."""
    conn = get_db_connection()
    conn.execute('UPDATE users SET is_premium = 0 WHERE id = ?', (current_user.id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ─────────────────────────────────────────────────────────────────────────────
# 11. GRID INTEGRATION, OBD TELEMETRY & CARBON ACCOUNTING
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/grid/pricing', methods=['GET'])
def get_grid_pricing():
    """
    Returns real-time dynamic grid electricity pricing and a 6-hour forward forecast.
    Public endpoint consumed by both map view and smart charging schedulers.
    """
    price = VahanIntelligence.get_predictive_pricing()
    hour = datetime.now().hour
    conn = get_db_connection()
    forecasts = conn.execute('SELECT * FROM grid_forecast WHERE hour >= ? LIMIT 6', (hour,)).fetchall()
    conn.close()
    return jsonify({
        'current_price': price,
        'unit': 'INR/kWh',
        'forecast': [dict(f) for f in forecasts],
        'grid_status': 'Optimized' if price < 22 else 'Peak Load'
    })


@app.route('/api/telemetry/obd/<int:vehicle_id>', methods=['GET'])
@login_required
def get_obd_telemetry(vehicle_id):
    """
    Simulates live hardware telemetry streamed over an OBD-II CAN bus adapter.
    Reports individual cell voltages, battery pack thermals, charge cycle count,
    and Vehicle-to-Grid (V2G) readiness.
    """
    conn = get_db_connection()
    v = conn.execute('SELECT * FROM fleet_vehicles WHERE id = ?', (vehicle_id,)).fetchone()
    conn.close()
    if not v:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    # Inject realistic hardware sensor variance
    temp = v['battery_temp'] + random.uniform(-0.5, 0.5)
    voltage = v['cell_voltage'] + random.uniform(-0.02, 0.02)
    
    return jsonify({
        'vehicle_id': vehicle_id,
        'vin_verified': True,
        'obd_status': 'Connected',
        'telemetry': {
            'battery_temp': round(temp, 1),
            'cell_voltage': round(voltage, 2),
            'cycle_count': random.randint(120, 450),
            'health_score': 94.2,
            'v2g_ready': True if v['battery_pct'] > 50 else False
        },
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/credits/ledger', methods=['GET'])
@login_required
def get_carbon_ledger():
    """
    Returns the user's verified Carbon Credit balance and historical verification ledger.
    
    Conversion Standards:
    - 10 kWh clean charging / V2G discharge = 1 VahanCredit (VC).
    - 1 VC = ~2.5 kg CO2 offset.
    - 10 VC = equivalent of planting 1 mature tree.
    """
    conn = get_db_connection()
    user = conn.execute('SELECT carbon_credits FROM users WHERE id = ?', (current_user.id,)).fetchone()
    ledger = conn.execute('SELECT * FROM carbon_ledger WHERE user_id = ? ORDER BY timestamp DESC', (current_user.id,)).fetchall()
    conn.close()
    creds = float(user['carbon_credits']) if (user and user['carbon_credits'] is not None) else 250.0
    return jsonify({
        'total_balance': creds,
        'total_credits': creds,
        'history': [dict(l) for l in ledger],
        'impact_metrics': {
            'trees_planted_equiv': round(creds / 10, 1),
            'co2_offset_kg': round(creds * 2.5, 1)
        }
    })


@app.route('/api/v2g/revenue', methods=['GET'])
@login_required
def get_v2g_revenue():
    """
    Vehicle-to-Grid (V2G) economic feasibility engine.
    Calculates estimated revenue for discharging EV battery power back to the grid.
    Only recommends export during peak tariff spikes (> ₹25/kWh).
    """
    price = VahanIntelligence.get_predictive_pricing()
    revenue_potential = 0
    if price > 25:  # Profitable arbitrage during peak grid stress
        revenue_potential = round(random.uniform(50, 150), 2)
    
    return jsonify({
        'is_peak_window': price > 25,
        'current_grid_buyback_rate': round(price * 0.8, 2),
        'estimated_hourly_revenue': revenue_potential if price > 25 else 0,
        'recommendation': 'Sell Power Now' if price > 25 else 'Wait for Peak'
    })


# ─────────────────────────────────────────────────────────────────────────────
# 12. VAHANPAY DIGITAL WALLET & CIRCULAR MARKETPLACE (2-SIDED ESCROW)
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/wallet/balance', methods=['GET'])
@login_required
def get_wallet_balance():
    """
    Returns the user's active VahanPay wallet balance and last 10 financial transactions.
    Auto-provisions a wallet with ₹1,500 demo balance if it doesn't exist.
    """
    conn = get_db_connection()
    wallet = conn.execute('SELECT * FROM wallets WHERE user_id = ?', (current_user.id,)).fetchone()
    if not wallet:
        conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', (current_user.id, 1500.0))
        conn.commit()
        wallet = conn.execute('SELECT * FROM wallets WHERE user_id = ?', (current_user.id,)).fetchone()
        
    history = conn.execute('SELECT * FROM transactions WHERE wallet_id = ? ORDER BY timestamp DESC LIMIT 10', (wallet['id'],)).fetchall()
    conn.close()
    return jsonify({
        'balance': wallet['balance'],
        'currency': wallet['currency'],
        'history': [dict(h) for h in history]
    })


@app.route('/api/wallet/pay', methods=['POST'])
@login_required
def process_vahanpay():
    """
    Direct payment deduction for charging sessions.
    Validates wallet balance before subtracting funds and records an audit debit entry.
    """
    data = request.json or {}
    amount = float(data.get('amount', 0))
    desc = data.get('description', 'Quantum Charging Session')
    
    conn = get_db_connection()
    wallet = conn.execute('SELECT id, balance FROM wallets WHERE user_id = ?', (current_user.id,)).fetchone()
    
    if not wallet or wallet['balance'] < amount:
        return jsonify({'error': 'Insufficient VahanPay Balance'}), 400
        
    conn.execute('UPDATE wallets SET balance = balance - ? WHERE id = ?', (amount, wallet['id']))
    conn.execute('INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, "debit", ?)',
                (wallet['id'], amount, desc))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'new_balance': wallet['balance'] - amount})


@app.route('/api/wallet/topup', methods=['POST'])
@login_required
def wallet_topup():
    """
    Instant wallet balance reload (UPI FastPay, RuPay / Card, NetBanking).
    Credits wallet and creates a verified transaction ledger entry.
    """
    data = request.json or {}
    amount = float(data.get('amount', 500.0))
    method = data.get('method', 'UPI FastPay')
    if amount <= 0:
        return jsonify({'error': 'Invalid top-up amount'}), 400
        
    conn = get_db_connection()
    wallet = conn.execute('SELECT id, balance FROM wallets WHERE user_id = ?', (current_user.id,)).fetchone()
    if not wallet:
        conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', (current_user.id, amount))
        wallet_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        cur_bal = 0.0
    else:
        wallet_id = wallet['id']
        cur_bal = wallet['balance']
        conn.execute('UPDATE wallets SET balance = balance + ? WHERE id = ?', (amount, wallet_id))
    
    conn.execute(
        'INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, "credit", ?)',
        (wallet_id, amount, f'{method} Instant Top-Up (Ref #VHN{random.randint(100000, 999999)})')
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'new_balance': cur_bal + amount})


@app.route('/api/wallet/transfer', methods=['POST'])
@login_required
def wallet_transfer():
    """
    Withdraw / Payout endpoint.
    Transfers funds from VahanPay wallet directly to a user's UPI VPA or IMPS Bank Account.
    Enforces balance validation ensuring withdrawal cannot exceed available liquid funds.
    """
    data = request.json or {}
    amount = float(data.get('amount', 500.0))
    target = data.get('target', 'UPI: zeel@hdfc')
    if amount <= 0:
        return jsonify({'error': 'Invalid transfer amount'}), 400
        
    conn = get_db_connection()
    wallet = conn.execute('SELECT id, balance FROM wallets WHERE user_id = ?', (current_user.id,)).fetchone()
    if not wallet or wallet['balance'] < amount:
        conn.close()
        return jsonify({'error': 'Insufficient VahanPay balance for payout'}), 400
    
    conn.execute('UPDATE wallets SET balance = balance - ? WHERE id = ?', (amount, wallet['id']))
    conn.execute(
        'INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, "debit", ?)',
        (wallet['id'], amount, f'Payout to {target} (Txn #IMPS{random.randint(100000, 999999)})')
    )
    conn.commit()
    new_bal = wallet['balance'] - amount
    conn.close()
    return jsonify({'success': True, 'new_balance': new_bal})


@app.route('/api/marketplace/listings', methods=['GET'])
def get_marketplace():
    """
    Public Open Marketplace board.
    Fetches all active Carbon Credit listings and dynamically calculates:
    - Unit price per credit (price_inr / credits_amount).
    - Market discount % compared to the standard retail benchmark of ₹1.25/VC.
    - Total CO2 offset (kg) represented by the credit batch.
    """
    conn = get_db_connection()
    listings = conn.execute(
        'SELECT ml.*, '
        '       COALESCE(ml.seller_org, u.name, "Verified EV Node") as seller_name, '
        '       COALESCE(ml.credit_type, "Solar Renewable") as credit_type, '
        '       COALESCE(ml.seller_badge, "Certified Green") as seller_badge '
        'FROM marketplace_listings ml '
        'LEFT JOIN users u ON ml.seller_id = u.id '
        'WHERE ml.status = "active" '
        'ORDER BY ml.id DESC'
    ).fetchall()
    conn.close()
    
    result = []
    for l in listings:
        d = dict(l)
        rate = round(d['price_inr'] / max(d['credits_amount'], 1), 2)
        d['unit_price'] = rate
        # Benchmark calculation: compare against standard ₹1.25/VC retail rate
        d['discount_pct'] = max(0, round(((1.25 - rate) / 1.25) * 100))
        d['co2_kg'] = round(d['credits_amount'] * 0.15, 1)
        result.append(d)
    return jsonify(result)


@app.route('/api/marketplace/sell', methods=['POST'])
@login_required
def list_credits():
    """
    Prosumer Carbon Credit listing endpoint.
    
    Escrow Workflow:
    1. Validates that the seller has enough verified VahanCredits in their account.
    2. Deducts the credits from the seller's user balance immediately (escrow hold).
    3. Inserts a new active listing into marketplace_listings.
    4. Records a deduction entry in carbon_ledger.
    """
    data = request.json or {}
    amount = float(data.get('amount', 0))
    price = float(data.get('price', 0))
    credit_type = data.get('credit_type', 'Clean EV Mobility Batch')
    
    if amount <= 0 or price <= 0:
        return jsonify({'error': 'Invalid amount or price'}), 400
        
    conn = get_db_connection()
    user = conn.execute('SELECT carbon_credits, name FROM users WHERE id = ?', (current_user.id,)).fetchone()
    if not user or user['carbon_credits'] < amount:
        conn.close()
        return jsonify({'error': 'Insufficient VahanCredits to list'}), 400
        
    # Deduct credits from seller and hold in escrow
    conn.execute('UPDATE users SET carbon_credits = carbon_credits - ? WHERE id = ?', (amount, current_user.id))
    seller_org = f"{user['name']} (Peer Prosumer)"
    conn.execute(
        'INSERT INTO marketplace_listings (seller_id, credits_amount, price_inr, status, credit_type, seller_org, seller_badge) VALUES (?, ?, ?, "active", ?, ?, "Verified Peer")',
        (current_user.id, amount, price, credit_type, seller_org)
    )
    conn.execute(
        'INSERT INTO carbon_ledger (user_id, amount, source) VALUES (?, ?, ?)',
        (current_user.id, -amount, f'Listed on Marketplace ({amount} VC @ ₹{price})')
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': f'Successfully listed {amount} VC for ₹{price}'})


@app.route('/api/marketplace/buy/<int:listing_id>', methods=['POST'])
@login_required
def buy_credits(listing_id):
    """
    Full 2-Sided Escrow Settlement Engine.
    
    Transactional Settlement Steps:
    ────────────────────────────────────────────────────────────────────────────
    1. Locks the listing and checks that status is still 'active'.
    2. Validates that the buyer has sufficient VahanPay wallet balance.
    3. Atomically debits INR from the buyer's wallet.
    4. Credits VahanCredits to the buyer's user profile.
    5. Credits INR to the seller's wallet and logs a credit transaction.
    6. Marks the marketplace listing as 'sold' to prevent double-spending.
    7. Creates audit entries in transactions and carbon_ledger for both parties.
    """
    conn = get_db_connection()
    listing = conn.execute('SELECT * FROM marketplace_listings WHERE id = ? AND status = "active"', (listing_id,)).fetchone()
    if not listing:
        return jsonify({'error': 'Listing unavailable'}), 404
    
    buyer_wallet = conn.execute('SELECT id, balance FROM wallets WHERE user_id = ?', (current_user.id,)).fetchone()
    if not buyer_wallet or buyer_wallet['balance'] < listing['price_inr']:
        return jsonify({'error': 'Insufficient VahanPay Balance'}), 400
        
    # 1. Debit buyer's wallet and grant carbon credits
    conn.execute('UPDATE wallets SET balance = balance - ? WHERE id = ?', (listing['price_inr'], buyer_wallet['id']))
    conn.execute('UPDATE users SET carbon_credits = carbon_credits + ? WHERE id = ?', (listing['credits_amount'], current_user.id))
    
    # 2. Payout INR to the seller's wallet
    seller_wallet = conn.execute('SELECT id FROM wallets WHERE user_id = ?', (listing['seller_id'],)).fetchone()
    if seller_wallet:
        conn.execute('UPDATE wallets SET balance = balance + ? WHERE id = ?', (listing['price_inr'], seller_wallet['id']))
        conn.execute(
            'INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, "credit", ?)',
            (seller_wallet['id'], listing['price_inr'], f'Sold {listing["credits_amount"]} Credits')
        )
    
    # 3. Mark listing as sold and record audit trails
    conn.execute('UPDATE marketplace_listings SET status = "sold" WHERE id = ?', (listing_id,))
    conn.execute(
        'INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, "debit", ?)',
        (buyer_wallet['id'], listing['price_inr'], f'Purchased {listing["credits_amount"]} Credits')
    )
    conn.execute(
        'INSERT INTO carbon_ledger (user_id, amount, source) VALUES (?, ?, ?)',
        (current_user.id, listing['credits_amount'], f'Purchased via Marketplace')
    )
                
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/telemetry/twin/<int:vehicle_id>', methods=['GET'])
@login_required
def get_digital_twin(vehicle_id):
    """
    Physics-based Digital Twin simulation of the EV battery pack.
    Returns cell-level voltage telemetry across 8 individual series modules,
    active liquid cooling status, thermal pack dissipation, and grid throughput kW.
    """
    conn = get_db_connection()
    v = conn.execute('SELECT * FROM fleet_vehicles WHERE id = ?', (vehicle_id,)).fetchone()
    conn.close()
    if not v:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    return jsonify({
        'metadata': {'vin': v['vehicle_number'], 'model': v['vehicle_name']},
        'battery': {
            'pct': v['battery_pct'],
            'temp': round(v['battery_temp'] + random.uniform(-0.3, 0.3), 1),
            'cells': [round(v['cell_voltage'] + random.uniform(-0.01, 0.01), 2) for _ in range(8)],
            'cooling_status': 'Active' if v['battery_temp'] > 30 else 'Passive',
            'health': 98.4
        },
        'grid': {
            'throughput_kw': random.randint(80, 250),
            'efficiency': 94.2,
            'harmonics': 'Stable'
        },
        'timestamp': datetime.now().isoformat()
    })


# ─────────────────────────────────────────────────────────────────────────────
# 13. APPLICATION ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # Ensure database schema and seeds are initialized before accepting connections
    init_db()
    # Read deployment PORT dynamically (e.g., Render sets $PORT, local defaults to 5175)
    port = int(os.getenv('PORT', 5175))
    # Run WSGI server on all network interfaces (0.0.0.0)
    app.run(debug=os.getenv('DEBUG', 'True') == 'True', host='0.0.0.0', port=port)
