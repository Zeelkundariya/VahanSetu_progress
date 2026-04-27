# ══════════════════════════════════════════════════════════════════════
#   VAHANSETU - ENTERPRISE BACKEND ARCHITECTURE (v5.0 Production)
#   ──────────────────────────────────────────────────────────────────────
#   Core: Flask / SQLite (WAL) / Python 3.x
#   Intelligence: Adaptive Trip Planning, Unified Telemetry, Host CRUD.
# ══════════════════════════════════════════════════════════════════════

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

app = Flask(__name__, static_folder='client/dist', static_url_path='/', template_folder='client/dist')
app.config['JWT_SECRET'] = 'vahan-jwt-quantum-vault-2026'
app.secret_key = 'vs-ultra-secure-key-2026'
CORS(app)

# ── VAHAN INTELLIGENCE: SIMULATION & PREDICTION ENGINE ──────────────────
class VahanIntelligence:
    @staticmethod
    def get_predictive_pricing():
        hour = datetime.now().hour
        conn = get_db_connection()
        forecast = conn.execute('SELECT * FROM grid_forecast WHERE hour = ?', (hour,)).fetchone()
        conn.close()
        base_price = 18.5
        if forecast:
            return round(base_price * forecast['price_multiplier'], 2)
        return base_price

    @staticmethod
    def simulate_ocpp_pulse():
        """Simulates real-time hardware pings that update station availability."""
        conn = get_db_connection()
        stations = conn.execute('SELECT id, total_bays FROM stations').fetchall()
        for s in stations:
            # Simulate real-world usage fluctuations
            change = random.choice([-1, 0, 1])
            new_avail = max(0, min(s['total_bays'], random.randint(0, s['total_bays'])))
            conn.execute('UPDATE stations SET available_bays = ?, current_load = ? WHERE id = ?', 
                        (new_avail, random.uniform(20.0, 95.0), s['id']))
        conn.commit()
        conn.close()

# Start Simulation background thread
def run_simulations():
    while True:
        try:
            VahanIntelligence.simulate_ocpp_pulse()
            time.sleep(30) # Pulse every 30 seconds
        except: pass

import threading
threading.Thread(target=run_simulations, daemon=True).start()

# ---------- Initialization & Persistence ----------

def get_db_connection():
    db_path = os.path.join(os.path.dirname(__file__), 'stations.db')
    conn = sqlite3.connect(db_path, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT "user", is_premium INTEGER DEFAULT 0, carbon_credits REAL DEFAULT 0.0)')
    conn.execute('CREATE TABLE IF NOT EXISTS fleets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, fleet_name TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS fleet_vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, fleet_id INTEGER, vehicle_name TEXT, vehicle_number TEXT, battery_pct INTEGER, range_km REAL, lat REAL, lng REAL, status TEXT, total_energy REAL, total_cost REAL, battery_temp REAL DEFAULT 25.0, cell_voltage REAL DEFAULT 3.7)')
    conn.execute('CREATE TABLE IF NOT EXISTS stations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, address TEXT, lat REAL, lng REAL, connector_type TEXT, power_kw INTEGER, total_bays INTEGER, available_bays INTEGER, owner_id INTEGER, current_load REAL DEFAULT 0.0, price_per_kwh REAL DEFAULT 18.5)')
    conn.execute('CREATE TABLE IF NOT EXISTS charging_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER, station_id INTEGER, energy_kwh REAL, cost REAL, carbon_saved REAL, credits_earned REAL, start_time TEXT, end_time TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, station_id INTEGER)')
    conn.execute('CREATE TABLE IF NOT EXISTS security_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip_address TEXT, device_agent TEXT, status TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, message TEXT, is_read INTEGER DEFAULT 0)')
    conn.execute('CREATE TABLE IF NOT EXISTS carbon_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, source TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')
    conn.execute('CREATE TABLE IF NOT EXISTS grid_forecast (id INTEGER PRIMARY KEY AUTOINCREMENT, hour INTEGER, load_factor REAL, price_multiplier REAL)')
    
    # Seed Grid Forecast if empty
    if not conn.execute('SELECT id FROM grid_forecast LIMIT 1').fetchone():
        forecasts = [(h, 0.5 + 0.4 * math.sin(h/4), 1.0 + 0.5 * math.cos(h/6)) for h in range(24)]
        conn.executemany('INSERT INTO grid_forecast (hour, load_factor, price_multiplier) VALUES (?,?,?)', forecasts)
    
    # Ensure Admin
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE email = "admin@vahan.com"')
    if not cursor.fetchone():
        cursor.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                     ('Steward', 'admin@vahan.com', generate_password_hash('steward2026'), 'admin'))
    conn.commit()
    conn.close()

def seed_user_data(user_id, conn):
    # 1. Ensure a fleet exists for this user
    fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (user_id,)).fetchone()
    if not fleet:
        conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (user_id, 'Global Logistics Alpha'))
        fleet_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    else:
        fleet_id = fleet['id']
        
    # 2. Ensure comprehensive vehicles exist
    v_count = conn.execute('SELECT COUNT(*) FROM fleet_vehicles WHERE fleet_id = ?', (fleet_id,)).fetchone()[0]
    if v_count == 0:
        demo_v = [
            (fleet_id, 'Intercity-Express 01', 'GJ-01-EV-1001', 4500.0, 54000.0, 'moving', 88, 23.0225, 72.5714),
            (fleet_id, 'Gandhinagar Shuttle', 'GJ-18-EV-2002', 2800.0, 33600.0, 'moving', 42, 23.2156, 72.6369),
            (fleet_id, 'Industrial Cargo-X', 'GJ-18-TX-0052', 8900.0, 106800.0, 'low_battery', 12, 23.23, 72.51),
            (fleet_id, 'Metro Delivery-04', 'GJ-01-AX-9999', 1200.0, 14400.0, 'idle', 95, 23.01, 72.55),
            (fleet_id, 'Executive Sedan 09', 'MH-01-EQ-7777', 2100.0, 25200.0, 'charging', 65, 19.0760, 72.8777)
        ]
        conn.executemany('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, total_kwh, total_spend, status, battery_pct, lat, lng) VALUES (?,?,?,?,?,?,?,?,?)', demo_v)
        
    # 3. Ensure some host stations exist
    s_count = conn.execute('SELECT COUNT(*) FROM stations WHERE owner_id = ?', (user_id,)).fetchone()[0]
    if s_count == 0:
        demo_s = [
            ('Solaris Hub North', 'Ashram Road, Ahmedabad', 23.0338, 72.585, 'CCS2', 150, 12, 8, user_id),
            ('Kalol Central Charging Plaza', 'Kalol Highway, Gujarat', 23.235, 72.511, 'CCS2', 120, 10, 6, user_id),
            ('Nexus Gandhinagar', 'Sector 21, Gandhinagar', 23.2156, 72.6369, 'Type2', 60, 6, 2, user_id),
            ('Skyline Highway Node', 'NH-48, Kheda', 22.75, 72.68, 'CCS2', 240, 4, 1, user_id)
        ]
        conn.executemany('INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id) VALUES (?,?,?,?,?,?,?,?,?)', demo_s)
    
    # 4. Seed significant charging sessions for Analytics and Profile
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
                energy = round(random.uniform(15.0, 85.0), 1)
                cost = round(energy * 15.5, 0)
                start = (now - timedelta(days=random.randint(0, 14), hours=random.randint(0, 23))).strftime('%Y-%m-%d %H:%M:%S')
                end = (datetime.strptime(start, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=random.randint(30, 90))).strftime('%Y-%m-%d %H:%M:%S')
                demo_sess.append((vid, sid, energy, cost, start, end))
            conn.executemany('INSERT INTO charging_sessions (vehicle_id, station_id, energy_kwh, cost, start_time, end_time) VALUES (?,?,?,?,?,?)', demo_sess)

    # 5. Seed some notifications
    n_count = conn.execute('SELECT COUNT(*) FROM notifications WHERE user_id = ?', (user_id,)).fetchone()[0]
    if n_count == 0:
        demo_n = [
            (user_id, 'Industrial Cargo-X battery reached critical level (12%)'),
            (user_id, 'Solaris Hub North weekly revenue report is ready'),
            (user_id, 'New charging hub "Ahmedabad East" is now online near your route'),
            (user_id, 'Gandhinagar Shuttle scheduled maintenance in 48 hours')
        ]
        conn.executemany('INSERT INTO notifications (user_id, message) VALUES (?, ?)', demo_n)

    conn.commit()

init_db()

# ---------- Identity Management ----------

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'serve'

class User(UserMixin):
    def __init__(self, id, name, email, role, is_premium):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.is_premium = is_premium

@login_manager.user_loader
def load_user(user_id):
    conn = get_db_connection()
    u = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if u: return User(u['id'], u['name'], u['email'], u['role'], u['is_premium'])
    return None

@app.context_processor
def inject_user():
    if current_user.is_authenticated:
        return dict(user_name=current_user.name, user_role=current_user.role, is_premium=current_user.is_premium)
    return dict(user_name=None, user_role='guest', is_premium=False)

# --- SECURITY UTILITIES ---
def verify_jwt(token):
    try:
        data = jwt.decode(token, app.config['JWT_SECRET'], algorithms=['HS256'])
        return data
    except:
        return None

@app.before_request
def validate_session():
    # Allow public access to certain routes
    public = ['/', '/login', '/signup', '/logout', '/api/me']
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
        if not payload or payload.get('user_id') != current_user.id:
            logout_user()
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Invalid token'}), 401
            flash('🛡️ Security Protocol Violation: Token mismatch.', 'error')
            return redirect(url_for('serve'))
    elif not current_user.is_authenticated and request.path.startswith('/api/') and request.path != '/api/me':
        return jsonify({'error': 'Authentication required'}), 401

# ---------- Core Routing Engine ----------

# ── SERVE REACT FRONTEND ──
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    return render_template("index.html")

# ── JSON API: /api/me ──
@app.route('/api/me')
def api_me():
    if current_user.is_authenticated:
        return jsonify({'id': current_user.id, 'name': current_user.name, 'email': current_user.email, 'role': current_user.role, 'is_premium': current_user.is_premium})
    return jsonify(None), 401

@app.route('/signup', methods=['POST'])
def signup():
    # Support both form-data and JSON
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
        conn.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                     (name, email, generate_password_hash(password)))
        conn.commit()
        try:
            send_vahan_email(to_email=email, subject="💎 VAHANSETU: Provisioning Success", title=f"Welcome, {name}!", message="Your account has been created. Please log in.", action_text="Login")
        except: pass
        if is_api:
            return jsonify({'success': True, 'message': 'Account created! Please log in.'})
        flash('💎 Identity Provisioned: Please log in.', 'success')
        return redirect(url_for('serve'))
    except Exception as e:
        if is_api:
            return jsonify({'success': False, 'message': 'This email is already registered.'}), 409
        flash('Security Alert: Email already exists.', 'error')
        return redirect(url_for('serve'))
    finally: conn.close()

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return redirect(url_for('serve'))
    
    # Support both form-data and JSON
    data = request.get_json(silent=True) or {}
    email = (request.form.get('email', '') or data.get('email', '')).strip().lower()
    password = (request.form.get('password', '') or data.get('password', ''))
    is_api = request.is_json or 'application/json' in request.headers.get('Accept', '')

    if not email or not password:
        if is_api:
            return jsonify({'success': False, 'message': 'Crendentials required.'}), 400
        return redirect(url_for('serve'))

    conn = get_db_connection()
    u = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if u and check_password_hash(u['password'], password):
        # Generate token
        token = jwt.encode({'user_id': u['id'], 'email': u['email'], 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['JWT_SECRET'], algorithm='HS256')
        
        login_user(User(u['id'], u['name'], u['email'], u['role'], u['is_premium']))
        
        try:
            conn = get_db_connection()
            conn.execute('INSERT INTO security_logs (user_id, ip_address, device_agent, status) VALUES (?, ?, ?, ?)',
                         (u['id'], request.remote_addr, request.headers.get('User-Agent', 'Unknown'), 'Success'))
            conn.commit(); conn.close()
            send_vahan_email(to_email=email, subject="🔔 VahanSetu — Secure Login Detected", title="Login Successful", message=f"Session initiated from {request.remote_addr}.", action_text="Open Dashboard")
        except: pass
        
        # Return JSON for React, redirect for HTML
        if is_api:
            resp = jsonify({'success': True, 'user': {'id': u['id'], 'name': u['name'], 'email': u['email'], 'role': u['role'], 'is_premium': u['is_premium']}})
        else:
            resp = redirect('/')
        resp.set_cookie('vs_jwt_nexus', token, httponly=True, samesite='Lax')
        if not is_api: flash(f'🛡️ Access Granted: {u["name"]}.', 'success')
        return resp
    
    if u:
        conn = get_db_connection()
        conn.execute('INSERT INTO security_logs (user_id, ip_address, device_agent, status) VALUES (?, ?, ?, ?)',
                     (u['id'], request.remote_addr, request.headers.get('User-Agent', 'Unknown'), 'Failure'))
        conn.commit(); conn.close()

    time.sleep(1.0)
    if is_api:
        return jsonify({'success': False, 'message': 'Invalid email or incorrect password.'}), 401
    flash('Authentication Failure: Invalid credentials.', 'error')
    return redirect(url_for('serve'))

@app.route('/logout')
def logout():
    logout_user()
    resp = redirect(url_for('serve')) if not request.args.get('api') else jsonify({'success': True})
    resp.delete_cookie('vs_jwt_nexus')
    return resp

# ── REACT JSON API ENDPOINTS ──

@app.route('/api/fleet')
@login_required
def api_fleet():
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT * FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet:
            conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (current_user.id, 'Nexus Fleet Alpha'))
            conn.commit()
            fleet = conn.execute('SELECT * FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        v_count = conn.execute('SELECT COUNT(*) FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchone()[0]
        if v_count == 0:
            demo = [(fleet['id'],'Ahmedabad Express-01','GJ-01-EV-1200',1540.0,18500.0,23.0225,72.5714,'idle',82),
                    (fleet['id'],'Gandhinagar Courier','GJ-18-AV-9981',2200.0,26400.0,23.2156,72.6369,'charging',45),
                    (fleet['id'],'Kalol Industrial Ops','GJ-18-TX-0052',4500.0,54000.0,23.23,72.51,'low_battery',12)]
            conn.executemany('INSERT INTO fleet_vehicles (fleet_id,vehicle_name,vehicle_number,total_kwh,total_spend,lat,lng,status,battery_pct) VALUES (?,?,?,?,?,?,?,?,?)', demo)
            conn.commit()
        vehicles = [dict(v) for v in conn.execute('SELECT * FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchall()]
        print(f"DEBUG: api_fleet - user_id: {current_user.id}, fleet_id: {fleet['id']}, vehicle_count: {len(vehicles)}")
        sessions_raw = conn.execute('SELECT cs.*, fv.vehicle_name, s.name as station_name FROM charging_sessions cs JOIN fleet_vehicles fv ON cs.vehicle_id = fv.id JOIN stations s ON cs.station_id = s.id WHERE fv.fleet_id = ? ORDER BY cs.start_time DESC LIMIT 15', (fleet['id'],)).fetchall()
        totals = conn.execute('SELECT SUM(total_kwh), SUM(total_spend), AVG(battery_pct) FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchone()
        resp_data = {
            'fleet': dict(fleet), 'fleet_vehicles': vehicles,
            'fleet_sessions': [dict(s) for s in sessions_raw],
            'fleet_kwh': round(totals[0] or 0, 1), 'fleet_spend': round(totals[1] or 0, 2),
            'avg_battery': round(totals[2] or 0, 1), 'health_score': 98
        }
        print(f"DEBUG: api_fleet - response: {resp_data['fleet_kwh']} kWh, {resp_data['fleet_spend']} spend")
        return jsonify(resp_data)
    finally: conn.close()

@app.route('/api/vehicle/lookup', methods=['POST'])
@login_required
def api_vehicle_lookup():
    plate = (request.json or {}).get('plate_number', '').strip().upper()
    if not plate: return jsonify({'status': 'error', 'message': 'Plate number required'}), 400
    
    # Mock Master Registry for Asset Discovery
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
        # Generate a generic success for demo purposes if not in registry
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
    data = request.json or {}
    name = data.get('vehicle_name')
    plate = data.get('vehicle_number')
    
    conn = get_db_connection()
    try:
        # Ensure fleet exists for current user
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet:
            conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (current_user.id, f"{current_user.name}'s Fleet"))
            fleet_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        else:
            fleet_id = fleet['id']
            
        # Add vehicle with randomized telemetry
        conn.execute('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, total_kwh, total_spend, status, battery_pct, lat, lng) VALUES (?,?,?,?,?,?,?,?,?)',
                     (fleet_id, name, plate, 0, 0, 'idle', random.randint(30, 95), 23.0225, 72.5714))
        conn.commit()
        return jsonify({'success': True})
    finally: conn.close()

@app.route('/api/fleet/optimize', methods=['POST'])
@login_required
def api_fleet_optimize():
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet: return jsonify({'status': 'error', 'message': 'No fleet found'}), 404
        
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
    finally: conn.close()

@app.route('/api/fleet/vehicle/<int:v_id>', methods=['DELETE'])
@login_required
def api_fleet_vehicle_delete(v_id):
    conn = get_db_connection()
    try:
        # Verify vehicle belongs to user's fleet
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet: return jsonify({'success': False, 'message': 'Fleet not found'}), 404
        
        v = conn.execute('SELECT id FROM fleet_vehicles WHERE id = ? AND fleet_id = ?', (v_id, fleet['id'])).fetchone()
        if not v: return jsonify({'success': False, 'message': 'Access denied: Asset not in fleetRegistry'}), 403
        
        conn.execute('DELETE FROM fleet_vehicles WHERE id = ?', (v_id,))
        conn.commit()
        return jsonify({'success': True})
    finally: conn.close()

@app.route('/api/fleet/vehicle/<int:v_id>', methods=['PATCH'])
@login_required
def api_fleet_vehicle_update(v_id):
    data = request.json or {}
    name = data.get('vehicle_name')
    number = data.get('vehicle_number')
    
    conn = get_db_connection()
    try:
        fleet = conn.execute('SELECT id FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
        if not fleet: return jsonify({'success': False, 'message': 'Fleet not found'}), 404
        
        v = conn.execute('SELECT id FROM fleet_vehicles WHERE id = ? AND fleet_id = ?', (v_id, fleet['id'])).fetchone()
        if not v: return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        if name: conn.execute('UPDATE fleet_vehicles SET vehicle_name = ? WHERE id = ?', (name, v_id))
        if number: conn.execute('UPDATE fleet_vehicles SET vehicle_number = ? WHERE id = ?', (number, v_id))
        conn.commit()
        return jsonify({'success': True})
    finally: conn.close()

@app.route('/api/host/dashboard')
@login_required
def api_host_dashboard():
    conn = get_db_connection()
    try:
        seed_user_data(current_user.id, conn)
        owned = conn.execute('SELECT s.*, COALESCE(SUM(cs.cost),0) as total_revenue, COUNT(cs.id) as sessions_count FROM stations s LEFT JOIN charging_sessions cs ON s.id = cs.station_id WHERE s.owner_id = ? GROUP BY s.id', (current_user.id,)).fetchall()
        agg = conn.execute('SELECT COALESCE(SUM(energy_kwh),0) as e, COALESCE(SUM(cost),0) as r, COUNT(*) as s FROM charging_sessions cs JOIN stations sv ON cs.station_id = sv.id WHERE sv.owner_id = ?', (current_user.id,)).fetchone()
        events = conn.execute('SELECT cs.*, s.name as station_name FROM charging_sessions cs JOIN stations s ON cs.station_id = s.id WHERE s.owner_id = ? ORDER BY cs.start_time DESC LIMIT 8', (current_user.id,)).fetchall()
        return jsonify({
            'status': 'success',
            'stations': [dict(s) for s in owned],
            'stats': {'revenue': round(float(agg['r'] or 0),2), 'kwh': round(float(agg['e'] or 0),1), 'sessions': int(agg['s'] or 0), 'revenue_growth': 12.4, 'network_uptime': 99.8, 'active_bays': sum(s['available_bays'] or 0 for s in owned), 'total_bays': sum(s['total_bays'] or 0 for s in owned)},
            'recent_events': [dict(e) for e in events]
        })
    finally: conn.close()

@app.route('/api/host/deploy', methods=['POST'])
@login_required
def api_host_deploy():
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
        conn.execute('INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id) VALUES (?,?,?,?,?,?,?,?,?)',
                     (name, address, float(lat), float(lng), connector, int(power), int(bays), int(bays), current_user.id))
        conn.commit()
        return jsonify({'success': True, 'message': f'Node {name} successfully initialized.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally: conn.close()

@app.route('/api/host/station/<int:station_id>', methods=['DELETE'])
@login_required
def api_host_station_delete(station_id):
    conn = get_db_connection()
    try:
        # Security: verify ownership before deletion
        station = conn.execute('SELECT owner_id FROM stations WHERE id = ?', (station_id,)).fetchone()
        if not station:
            return jsonify({'success': False, 'message': 'Station not found.'}), 404
        
        # Casting because current_user.id might be a string in some Flask configurations
        if int(station['owner_id']) != int(current_user.id):
            return jsonify({'success': False, 'message': 'Forbidden: Ownership verification failed.'}), 403
        
        # Also clean up associated charging sessions to maintain referential integrity
        conn.execute('DELETE FROM charging_sessions WHERE station_id = ?', (station_id,))
        conn.execute('DELETE FROM stations WHERE id = ?', (station_id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Infrastructure decommissioned successfully.'})
    except Exception as e:
        print(f"Station Deletion FAIL: {str(e)}") # Log for debug
        return jsonify({'success': False, 'message': f'Server Error: {str(e)}'}), 500
    finally: conn.close()

@app.route('/api/analytics_data')
@login_required
def api_analytics_data():
    conn = get_db_connection()
    try:
        seed_user_data(current_user.id, conn)
        agg = conn.execute('SELECT COUNT(*) as s, COALESCE(SUM(energy_kwh),0) as e, COALESCE(SUM(cost),0) as r FROM charging_sessions').fetchone()
        top_raw = conn.execute('SELECT s.id, s.name, s.power_kw, COUNT(cs.id) as sessions_count, SUM(cs.energy_kwh) as station_energy, SUM(cs.cost) as station_revenue FROM stations s LEFT JOIN charging_sessions cs ON s.id = cs.station_id GROUP BY s.id ORDER BY station_revenue DESC LIMIT 8').fetchall()
        top = [{'id':s['id'],'name':s['name'],'sessions':s['sessions_count'] or 0,'energy':round(s['station_energy'] or 0,1),'revenue':round(s['station_revenue'] or 0,0),'utilization':min(round((s['sessions_count'] or 0)*6.5,1),100),'status':'optimal'} for s in top_raw]
        return jsonify({'analytics': {'total_sessions':int(agg['s'] or 0),'total_kwh':round(float(agg['e'] or 0),1),'total_revenue':round(float(agg['r'] or 0),0),'revenue_trend':'+14.2%','energy_trend':'+8.5%','top_station':top[0]['name'] if top else 'N/A'}, 'top_stations': top})
    finally: conn.close()

@app.route('/api/profile_data')
@login_required
def api_profile_data():
    conn = get_db_connection()
    try:
        history = [dict(r) for r in conn.execute('SELECT cs.*, s.name as station_name, s.address FROM charging_sessions cs JOIN stations s ON cs.station_id = s.id ORDER BY cs.start_time DESC LIMIT 15').fetchall()]
        return jsonify({'stats':{'total_sessions':len(history),'total_kwh':round(sum(h['energy_kwh'] for h in history),1),'total_spend':round(sum(h['cost'] for h in history),0),'co2_saved':round(sum(h['energy_kwh'] for h in history)*0.4,1)}, 'history':history})
    finally: conn.close()

@app.route('/api/profile/update', methods=['POST'])
@login_required
def api_profile_update():
    name = (request.json or {}).get('name','').strip()
    if not name: return jsonify({'success':False,'message':'Name cannot be empty'}), 400
    conn = get_db_connection()
    try:
        conn.execute('UPDATE users SET name = ? WHERE id = ?', (name, current_user.id)); conn.commit()
        return jsonify({'success': True})
    finally: conn.close()

@app.route('/api/change_password', methods=['POST'])
@login_required
def api_change_password():
    data = request.json or {}
    cur, new, conf = data.get('current_password',''), data.get('new_password',''), data.get('confirm_password','')
    if new != conf: return jsonify({'success':False,'message':'Passwords do not match'}), 400
    if len(new) < 8: return jsonify({'success':False,'message':'Password must be 8+ chars'}), 400
    conn = get_db_connection()
    try:
        u = conn.execute('SELECT password FROM users WHERE id = ?', (current_user.id,)).fetchone()
        if not check_password_hash(u['password'], cur):
            return jsonify({'success':False,'message':'Current password is incorrect'}), 400
        conn.execute('UPDATE users SET password = ? WHERE id = ?', (generate_password_hash(new), current_user.id)); conn.commit()
        return jsonify({'success': True})
    finally: conn.close()

@app.route('/api/analytics/filter')
@login_required
def api_analytics_filter():
    cycle = request.args.get('cycle', '7D')
    n = {'24H': 24, '7D': 7, '30D': 30}.get(cycle, 7)
    labels = [f"Period {i+1}" for i in range(n)]
    energy = [random.randint(50, 400) for _ in range(n)]
    revenue = [random.randint(1000, 5000) for _ in range(n)]
    return jsonify({'labels': labels, 'energy': energy, 'revenue': revenue})

@app.route('/api/notifications')
@login_required
def api_notifications():
    conn = get_db_connection()
    try:
        notes = [dict(n) for n in conn.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10', (current_user.id,)).fetchall()]
        unread = conn.execute('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0', (current_user.id,)).fetchone()[0]
        return jsonify({'notifications': notes, 'unread': unread})
    finally: conn.close()

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return round(R * 2 * math.asin(math.sqrt(a)), 2)

def geocode_location(q):
    if not q or q.lower() == 'my location': return None
    try:
        r = requests.get(f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1", 
                         headers={'User-Agent': 'VahanSetu-App-2026'}, timeout=6)
        d = r.json()
        if d: return {"lat": float(d[0]['lat']), "lng": float(d[0]['lon']), "name": d[0]['display_name']}
    except: pass
    return None

@app.route('/api/stations')
@login_required
def get_stations():
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    
    # DEMO LOCKDOWN: Aggressively force Gujarat if coordinates look like South India/Bengaluru
    if lat is not None:
        if lat < 20: # Bengaluru is ~12.9, Gujarat is ~23.0
            print(f"LOCKDOWN: Re-routing Bengaluru signal ({lat}) to Ahmedabad.")
            lat, lng = 23.0225, 72.5714
    
    if lat is None or lng is None:
        lat, lng = 23.0225, 72.5714

    # 1. Fetch Local Verified Infrastructure from DB
    conn = get_db_connection()
    db_stations = [dict(s) for s in conn.execute('SELECT * FROM stations').fetchall()]
    conn.close()
    
    for s in db_stations:
        s['distance_km'] = haversine(lat, lng, s['lat'], s['lng'])
        s['is_verified_db'] = True

    # TOTAL SHUTDOWN: Return ONLY local DB stations for the demo
    print(f"TOTAL SHUTDOWN: Returning only {len(db_stations)} DB stations.")
    unique_stations = { s['id']: s for s in db_stations }.values()
    sorted_stations = sorted(unique_stations, key=lambda x: x['distance_km'])
    return jsonify(list(sorted_stations))

@app.route('/api/trip_plan')
@login_required
def trip_plan():
    start_q = request.args.get('start')
    end_q = request.args.get('end')
    user_lat = request.args.get('lat', type=float)
    user_lng = request.args.get('lng', type=float)

    start_node = geocode_location(start_q) if start_q and start_q.lower() != 'my location' else {"lat": user_lat, "lng": user_lng, "name": "Current Position"}
    end_node = geocode_location(end_q)
    
    if not start_node or not end_node or start_node['lat'] is None or end_node['lat'] is None:
        return jsonify({"error": "Unable to geocode locations. Please enter valid cities."}), 400

    try:
        # 1. Fetch Route from OSRM
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_node['lng']},{start_node['lat']};{end_node['lng']},{end_node['lat']}?overview=full&geometries=geojson&steps=true"
        r = requests.get(osrm_url, timeout=10)
        route_data = r.json()
        
        if route_data.get('code') != 'Ok':
            return jsonify({"error": "No route found between these points."}), 404
            
        route = route_data['routes'][0]
        geometry = route['geometry']
        # Applying a 1.016x multiplier to account for real-world road deviations and U-turns
        total_km = round((route['distance'] / 1000) * 1.016, 1)
        total_time_min = int(route['duration'] / 60)
        
        # Format instructions for the Frontend (Maneuver Road Sheet)
        instructions = []
        for leg in route.get('legs', []):
            for step in leg.get('steps', []):
                m = step.get('maneuver', {})
                name = step.get('name')
                osrm_instr = m.get('instruction', '')
                dist_km = round(step.get('distance', 0) / 1000, 2)
                
                # High-Fidelity Instruction Builder (Road Name Extraction)
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
                    "lat": m.get('location', [0,0])[1],
                    "lng": m.get('location', [0,0])[0],
                    "type": m.get('type', 'step')
                })

        # 2. Find ALL EV Stations along the Route Corridor (Parallel Discovery)
        coords = geometry['coordinates']
        corridor_stations = []
        
        sampling_step = max(10, len(coords) // (int(total_km // 50) + 1))
        search_pts = [coords[i] for i in range(0, len(coords), sampling_step)]
        search_pts.append(coords[-1])
        
        def fetch_corridor_hubs(pt):
            local_hubs = []
            try:
                # Optimized search: only Nodes for speed
                cor_query = f'[out:json][timeout:8];node["amenity"="charging_station"](around:25000, {pt[1]}, {pt[0]});out center;'
                r_c = requests.post("https://overpass-api.de/api/interpreter", data={'data': cor_query}, timeout=9)
                elements = r_c.json().get('elements', [])
                for e in elements:
                    tags = e.get('tags', {})
                    local_hubs.append({
                        "id": str(e.get('id')),
                        "name": tags.get('operator') or tags.get('name') or tags.get('brand') or f"EV Station #{e.get('id')}",
                        "lat": float(e.get('lat')), "lng": float(e.get('lon')),
                        "address": tags.get('addr:city') or tags.get('addr:street') or "Corridor Segment",
                        "power_kw": int(float(''.join(c for c in str(tags.get('max_power','60')) if c.isdigit() or c == '.') or 60)),
                        "total_bays": int(tags.get('capacity', 4)),
                        "available_bays": random.randint(1, 4),
                        "distance_km": haversine(start_node['lat'], start_node['lng'], float(e.get('lat')), float(e.get('lon')))
                    })
            except: pass
            return local_hubs

        # Execute searches in parallel to minimize latency
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            # Increased sampling points for a "Same to Same" experience with legacy dashboard
            results = list(executor.map(fetch_corridor_hubs, search_pts[:10])) 
            
            seen_ids = set()
            for res_list in results:
                for hub in res_list:
                    if hub['id'] not in seen_ids:
                        corridor_stations.append(hub)
                        seen_ids.add(hub['id'])

        # Sort corridor stations by distance from the START point
        corridor_stations.sort(key=lambda s: s['distance_km'])

        # Time estimation with Real-World Traffic & Congestion Buffer (Google-grade Calibration)
        raw_duration = route.get('duration', 0)
        # Using a 1.32x multiplier to account for Indian highway traffic and urban intersections
        padded_time_min = int(raw_duration / 60 * 1.32)
        
        # Clean up time string
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
            "stops": corridor_stations[:15] # Return top 15 strategic stops along the route
        })
    except requests.exceptions.Timeout:
        return jsonify({"error": "Corridor Engine Timeout. Please try a shorter route or verify connectivity."}), 504
    except Exception as e:
        print(f"TRIP ERROR: {e}")
        return jsonify({"error": "Quantum Route Engine Failure. Ensure city names are precise."}), 500

@app.route('/api/premium/verify', methods=['POST'])
@login_required
def premium_verify():
    data = request.json or {}
    conn = get_db_connection()
    conn.execute('UPDATE users SET is_premium = 1 WHERE id = ?', (current_user.id,))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/premium/cancel', methods=['POST'])
@login_required
def premium_cancel():
    conn = get_db_connection()
    conn.execute('UPDATE users SET is_premium = 0 WHERE id = ?', (current_user.id,))
    conn.commit(); conn.close()
    return jsonify({'success': True})

# ── NEXT-LEVEL FEATURES: OCPP, PREDICTIVE GRID, CARBON ECONOMY ────────

@app.route('/api/grid/pricing', methods=['GET'])
def get_grid_pricing():
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
    # Simulated real-time hardware telemetry
    conn = get_db_connection()
    v = conn.execute('SELECT * FROM fleet_vehicles WHERE id = ?', (vehicle_id,)).fetchone()
    conn.close()
    if not v: return jsonify({'error': 'Vehicle not found'}), 404
    
    # Add noise to simulate live hardware reading
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
    conn = get_db_connection()
    user = conn.execute('SELECT carbon_credits FROM users WHERE id = ?', (current_user.id,)).fetchone()
    ledger = conn.execute('SELECT * FROM carbon_ledger WHERE user_id = ? ORDER BY timestamp DESC', (current_user.id,)).fetchall()
    conn.close()
    return jsonify({
        'total_balance': user['carbon_credits'] if user else 0,
        'history': [dict(l) for l in ledger],
        'impact_metrics': {
            'trees_planted_equiv': round(user['carbon_credits'] / 10, 1) if user else 0,
            'co2_offset_kg': round(user['carbon_credits'] * 2.5, 1) if user else 0
        }
    })

@app.route('/api/v2g/revenue', methods=['GET'])
@login_required
def get_v2g_revenue():
    # Predictive revenue from selling power back to the grid
    price = VahanIntelligence.get_predictive_pricing()
    revenue_potential = 0
    if price > 25: # Only profitable during peak
        revenue_potential = round(random.uniform(50, 150), 2)
    
    return jsonify({
        'is_peak_window': price > 25,
        'current_grid_buyback_rate': round(price * 0.8, 2),
        'estimated_hourly_revenue': revenue_potential if price > 25 else 0,
        'recommendation': 'Sell Power Now' if price > 25 else 'Wait for Peak'
    })

if __name__ == '__main__':
    init_db()
    port = int(os.getenv('PORT', 5000))
    app.run(debug=os.getenv('DEBUG', 'True') == 'True', host='0.0.0.0', port=port)
