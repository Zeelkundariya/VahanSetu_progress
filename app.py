# ══════════════════════════════════════════════════════════════════════
#   VAHANSETU - ENTERPRISE BACKEND ARCHITECTURE (v5.0 Production)
#   ──────────────────────────────────────────────────────────────────────
#   Core: Flask / SQLite (WAL) / Python 3.x
#   Intelligence: Adaptive Trip Planning, Unified Telemetry, Host CRUD.
# ══════════════════════════════════════════════════════════════════════

from flask import Flask, jsonify, request, render_template, redirect, url_for
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import random
import math
import requests
import time
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'vs-ultra-secure-key-2026'
CORS(app)

# ---------- Initialization & Persistence ----------

def get_db_connection():
    conn = sqlite3.connect('stations.db', timeout=20)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, 
        password TEXT, role TEXT DEFAULT 'user', is_premium INTEGER DEFAULT 0
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, lat REAL, lng REAL, 
        address TEXT, connector_type TEXT, power_kw INTEGER, 
        total_bays INTEGER, available_bays INTEGER, queue_length INTEGER,
        owner_id INTEGER, price_per_kwh REAL DEFAULT 15.0,
        image_url TEXT, station_type TEXT DEFAULT 'city',
        opening_hours TEXT, last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS fleets (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, 
        fleet_name TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS fleet_vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT, fleet_id INTEGER, 
        vehicle_name TEXT, vehicle_number TEXT, battery_pct INTEGER, 
        range_km REAL, lat REAL, lng REAL, status TEXT DEFAULT 'idle',
        total_energy REAL DEFAULT 0, total_cost REAL DEFAULT 0
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS charging_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER, station_id INTEGER,
        energy_kwh REAL, cost REAL, start_time TEXT, end_time TEXT
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, station_id INTEGER
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, 
        message TEXT, is_read INTEGER DEFAULT 0, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    try: cursor.execute("ALTER TABLE stations ADD COLUMN price_per_kwh REAL DEFAULT 15.0")
    except: pass
    try: cursor.execute("ALTER TABLE stations ADD COLUMN station_type TEXT DEFAULT 'city'")
    except: pass
    try: cursor.execute("ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0")
    except: pass

    # Ensure Admin
    cursor.execute('SELECT id FROM users WHERE email = "admin@vahan.com"')
    if not cursor.fetchone():
        cursor.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                     ('Steward', 'admin@vahan.com', generate_password_hash('steward2026'), 'admin'))
    conn.commit()
    conn.close()

init_db()

def seed_user_data(user_id, conn):
    """Auto-seed stations and sessions for a user who has no stations yet."""
    existing = conn.execute('SELECT COUNT(*) FROM stations WHERE owner_id = ?', (user_id,)).fetchone()[0]
    if existing > 0:
        return  # already has data

    seed_stations = [
        ('Nexus Alpha Prime', 23.0225, 72.5714, 'SG Highway, Ahmedabad', 'CCS2', 150, 8, 3, user_id, 18.50, 'highway'),
        ('Ather Grid - Whitefield', 12.9698, 77.7500, 'Whitefield Main Rd, Bengaluru', 'CCS2', 120, 6, 2, user_id, 22.00, 'city'),
        ('Zeon Charging - Electronic City', 12.8399, 77.6770, 'Electronic City Phase 1, Bengaluru', 'Type2', 50, 4, 4, user_id, 15.00, 'city'),
        ('PowerGrid Ultra Hub', 28.6139, 77.2090, 'Connaught Place, New Delhi', 'CCS2', 180, 10, 5, user_id, 20.00, 'highway'),
        ('EcoVolt Station - Bandra', 19.0596, 72.8295, 'Bandra West, Mumbai', 'Type2', 60, 5, 3, user_id, 16.50, 'city'),
        ('ChargeZone Express', 23.0338, 72.5850, 'Navrangpura, Ahmedabad', 'CHAdeMO', 100, 6, 1, user_id, 19.00, 'city'),
    ]
    cursor = conn.cursor()
    cursor.executemany(
        'INSERT INTO stations (name, lat, lng, address, connector_type, power_kw, total_bays, available_bays, owner_id, price_per_kwh, station_type) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        seed_stations
    )
    conn.commit()

    # Now seed charging sessions for these stations
    station_ids = [r['id'] for r in conn.execute('SELECT id FROM stations WHERE owner_id = ?', (user_id,)).fetchall()]
    if station_ids:
        sessions = []
        for _ in range(50):
            sid = random.choice(station_ids)
            energy = round(random.uniform(12.0, 68.0), 1)
            cost = round(energy * random.uniform(15.0, 22.0), 2)
            ts = (datetime.now() - timedelta(hours=random.randint(1, 168))).strftime('%Y-%m-%d %H:%M:%S')
            sessions.append((1, sid, energy, cost, ts))
        cursor.executemany(
            'INSERT INTO charging_sessions (vehicle_id, station_id, energy_kwh, cost, start_time) VALUES (?, ?, ?, ?, ?)',
            sessions
        )
        conn.commit()


# ---------- Identity Management ----------

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'index'

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

# ---------- Core Routing Engine ----------

@app.route('/')
def index():
    if current_user.is_authenticated: return redirect(url_for('map_page'))
    return render_template('index.html')

@app.route('/signup', methods=['POST'])
def signup():
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                     (request.form['name'], request.form['email'], generate_password_hash(request.form['password'])))
        conn.commit()
        # Auto-login after successful signup
        u = conn.execute('SELECT * FROM users WHERE email = ?', (request.form['email'],)).fetchone()
        if u:
            login_user(User(u['id'], u['name'], u['email'], u['role'], u['is_premium']))
            return redirect(url_for('map_page'))
        return redirect(url_for('index'))
    except:
        from flask import flash
        flash('Email already registered. Please sign in.', 'error')
        return redirect(url_for('index'))
    finally: conn.close()

@app.route('/login', methods=['POST'])
def login():
    conn = get_db_connection()
    u = conn.execute('SELECT * FROM users WHERE email = ?', (request.form['email'],)).fetchone()
    conn.close()
    if u and check_password_hash(u['password'], request.form['password']):
        login_user(User(u['id'], u['name'], u['email'], u['role'], u['is_premium']))
        return redirect(url_for('map_page'))
    from flask import flash
    flash('Invalid email or password. Please try again.', 'error')
    return redirect(url_for('index'))

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

# ---------- Map & Trip Intelligence ----------

@app.route('/map')
@login_required
def map_page():
    return render_template('map.html')

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return round(R * 2 * math.asin(math.sqrt(a)), 2)

@app.route('/api/stations')
@login_required
def get_stations():
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    
    conn = get_db_connection()
    stations = conn.execute('SELECT * FROM stations').fetchall()
    conn.close()
    
    results = [dict(s) for s in stations]
    
    # Strictly Filter by Radius (50km) if user location is known
    if lat is not None and lng is not None:
        filtered = []
        for s in results:
            d = haversine(lat, lng, s['lat'], s['lng'])
            if d <= 50: # Only show stations within 50km of current location
                s['distance_km'] = d
                filtered.append(s)
        filtered.sort(key=lambda x: x['distance_km'])
        return jsonify(filtered)
        
    return jsonify(results[:20]) # Default limit to prevent clutter

@app.route('/api/trip_plan')
@login_required
def trip_plan():
    from_city = request.args.get('from', '').strip()
    to_city = request.args.get('to', '').strip()
    
    # Support direct coordinates to bypass geocoding (e.g. for "My Location")
    f_lat = request.args.get('from_lat', type=float)
    f_lng = request.args.get('from_lng', type=float)
    t_lat = request.args.get('to_lat', type=float)
    t_lng = request.args.get('to_lng', type=float)

    if not from_city and not f_lat: return jsonify({"error": "Missing start location."})
    if not to_city and not t_lat: return jsonify({"error": "Missing destination."})

    TRAFFIC_MULT = 1.38

    # Ensure Real industry stations exist
    conn = get_db_connection()
    count = conn.execute('SELECT COUNT(*) FROM stations').fetchone()[0]
    if count < 10:
        u_hubs = [
            ("Tata Power EZ Hub Bharuch", 21.7300, 73.0100, "Highway Colony, Bharuch", 120, 6, 1),
            ("ChargeZone Vadodara Hub", 22.3072, 73.1812, "Expressway Junction", 150, 8, 1),
            ("Relux Anand Parkway", 22.5645, 72.9289, "Anand Bypass Road", 60, 4, 1),
            ("Statiq Hub GIDC Kalol", 23.2333, 72.5167, "Panchvati Circle, Kalol", 150, 8, 1),
            ("Ather Grid Surat", 21.1702, 72.8311, "Surat North Junction", 50, 10, 1),
            ("Magenta Khopoli Hub", 18.7833, 73.3500, "Mumbai-Pune Corridor", 50, 4, 1)
        ]
        conn.executemany('INSERT INTO stations (name, lat, lng, address, power_kw, total_bays, owner_id) VALUES (?,?,?,?,?,?,?)', u_hubs)
        conn.commit()
    
    all_stations = conn.execute('SELECT * FROM stations').fetchall()
    conn.close()

    def geocode(place):
        if not place or place.lower() == "my location": return None
        try:
            r = requests.get(f"https://nominatim.openstreetmap.org/search?q={place},India&format=json&limit=1", headers={'User-Agent':'VahanSetu/1.0'}, timeout=8)
            data = r.json()
            if data: return [float(data[0]['lat']), float(data[0]['lon'])]
        except: pass
        return None

    # Resolve Coords: Use provided lat/lng or geocode the name
    fc = [f_lat, f_lng] if f_lat is not None else geocode(from_city)
    tc = [t_lat, t_lng] if t_lat is not None else geocode(to_city)

    if not fc or not tc: 
        err = "Could not find address."
        if from_city.lower() == "my location" and not f_lat: err = "Please enable GPS for 'My Location'."
        return jsonify({"error": err})

    geometry, instructions = None, []
    total_km, total_time = haversine(fc[0], fc[1], tc[0], tc[1]), "—"

    try:
        r = requests.get(f"https://router.project-osrm.org/route/v1/driving/{fc[1]},{fc[0]};{tc[1]},{tc[0]}?overview=full&geometries=geojson&steps=true", timeout=12)
        osrm = r.json()
        if osrm.get('routes'):
            route = osrm['routes'][0]
            total_km = round(route['distance'] / 1000, 1)
            dur_s = int(route['duration'] * TRAFFIC_MULT) 
            total_time = f"{int(dur_s//3600)}h {int((dur_s%3600)//60)}m"
            geometry = route['geometry']
            for leg in route['legs']:
                for step in leg['steps']:
                    m, name = step.get('maneuver', {}), step.get('name', '')
                    txt = f"{m.get('type','').title()} {m.get('modifier','')}".strip()
                    if name: txt += f" onto {name}"
                    instructions.append({"text":txt, "dist":round(step.get('distance',0))})
    except:
        geometry = {"type":"LineString", "coordinates":[[fc[1],fc[0]], [tc[1],tc[0]]]}

    # Strict Corridor logic: Sum of dist to endpoints must be within 1.1x total path
    route_stops = []
    for s in all_stations:
        d_from = haversine(fc[0], fc[1], s['lat'], s['lng'])
        d_to = haversine(tc[0], tc[1], s['lat'], s['lng'])
        if (d_from + d_to) < (total_km * 1.12): # Stricter corridor
            score = abs(0.5 - (d_from / total_km))
            route_stops.append({
                "id": s['id'], "name": s['name'], "lat": s['lat'], "lng": s['lng'],
                "address": s['address'], "power_kw": s['power_kw'], "available_bays": s['available_bays'] or 1,
                "total_bays": s['total_bays'], "distance_km": round(d_from, 1), "score": score
            })
    
    route_stops.sort(key=lambda x: x['score'])

    return jsonify({
        "status": "success",
        "from_coords": fc, "to_coords": tc,
        "total_km": total_km, "total_time": total_time,
        "stops": route_stops[:5], "geometry": geometry,
        "instructions": instructions[:15], "co2_saved_kg": round(total_km * 0.12, 1)
    })

# ---------- Fleet Management ----------

@app.route('/fleet')
@login_required
def fleet_dashboard():
    conn = get_db_connection()
    fleet = conn.execute('SELECT * FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
    if not fleet:
        conn.execute('INSERT INTO fleets (user_id, fleet_name) VALUES (?, ?)', (current_user.id, "Nexus Fleet Alpha"))
        conn.commit()
        fleet = conn.execute('SELECT * FROM fleets WHERE user_id = ?', (current_user.id,)).fetchone()
    
    # ── Auto-Seed Fleet Vehicles (Gujarat Regional Focus - Force Reset) ──
    v_stale = conn.execute('SELECT COUNT(*) FROM fleet_vehicles WHERE fleet_id = ? AND vehicle_name LIKE "Express Unit%"', (fleet['id'],)).fetchone()[0]
    v_count = conn.execute('SELECT COUNT(*) FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchone()[0]
    
    if v_count == 0 or v_stale > 0:
        conn.execute('DELETE FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],))
        demo_vehicles = [
            (fleet['id'], "Ahmedabad Express-01", "GJ-01-EV-1200", 82, 340.5, 23.0225, 72.5714, "idle", 1540.0, 18500.0),
            (fleet['id'], "Gandhinagar Courier", "GJ-18-AV-9981", 45, 182.0, 23.2156, 72.6369, "charging", 2200.0, 26400.0),
            (fleet['id'], "Kalol Industrial Ops", "GJ-18-TX-0052", 12, 45.3, 23.2300, 72.5100, "low_battery", 4500.0, 54000.0),
            (fleet['id'], "Ahmedabad Hub Unit", "GJ-01-CE-4444", 95, 410.8, 23.0338, 72.5850, "idle", 850.5, 10200.0),
            (fleet['id'], "Regional Field Unit", "GJ-18-EM-1122", 64, 215.1, 23.2400, 72.5300, "moving", 1100.2, 13200.0)
        ]
        conn.executemany('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, battery_pct, range_km, lat, lng, status, total_energy, total_cost) VALUES (?,?,?,?,?,?,?,?,?,?)', demo_vehicles)
        conn.commit()
    
    vehicles = conn.execute('SELECT * FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchall()
    
    # ── Auto-Seed Fleet Sessions (Connect to Real Stations) ──
    s_count = conn.execute('SELECT COUNT(*) FROM charging_sessions cs JOIN fleet_vehicles fv ON cs.vehicle_id = fv.id WHERE fv.fleet_id = ?', (fleet['id'], )).fetchone()[0]
    if s_count < 10:
        all_stations = conn.execute('SELECT id FROM stations').fetchall()
        if all_stations:
            v_ids = [v['id'] for v in vehicles]
            st_ids = [s['id'] for s in all_stations]
            fleet_sessions = []
            for _ in range(25):
                start = (datetime.now() - timedelta(days=random.randint(0,14), hours=random.randint(0,23))).strftime('%Y-%m-%d %H:%M:%S')
                energy = round(random.uniform(20, 60), 1)
                fleet_sessions.append((random.choice(v_ids), random.choice(st_ids), energy, round(energy * 12, 2), start))
            conn.executemany('INSERT INTO charging_sessions (vehicle_id, station_id, energy_kwh, cost, start_time) VALUES (?,?,?,?,?)', fleet_sessions)
            conn.commit()

    sessions = conn.execute('''
        SELECT cs.*, fv.vehicle_name, s.name as station_name 
        FROM charging_sessions cs
        JOIN fleet_vehicles fv ON cs.vehicle_id = fv.id
        JOIN stations s ON cs.station_id = s.id
        WHERE fv.fleet_id = ? ORDER BY cs.start_time DESC LIMIT 15
    ''', (fleet['id'],)).fetchall()
    
    # Aggregates
    totals = conn.execute('SELECT SUM(total_energy), SUM(total_cost), AVG(battery_pct) FROM fleet_vehicles WHERE fleet_id = ?', (fleet['id'],)).fetchone()
    fleet_kwh = round(totals[0] or 0, 1)
    fleet_spend = round(totals[1] or 0, 2)
    avg_battery = round(totals[2] or 0, 1)
    
    conn.close()
    return render_template('fleet.html', 
                          fleet=fleet, 
                          fleet_vehicles=vehicles, 
                          fleet_sessions=sessions, 
                          fleet_spend=fleet_spend, 
                          fleet_kwh=fleet_kwh, 
                          avg_battery=avg_battery,
                          health_score=98)

@app.route('/fleet/add', methods=['POST'])
@login_required
def add_vehicle():
    data = request.form
    conn = get_db_connection()
    conn.execute('INSERT INTO fleet_vehicles (fleet_id, vehicle_name, vehicle_number, battery_pct, range_km, lat, lng) VALUES (?, ?, ?, 80, 320, 23.02, 72.57)',
                 (data['fleet_id'], data['vehicle_name'], data['vehicle_number']))
    conn.commit()
    conn.close()
    return redirect(url_for('fleet_dashboard'))

# ---------- Host Portal (v5.0) ----------

@app.route('/cpo')
@login_required
def cpo_dashboard():
    conn = get_db_connection()
    try:
        if current_user.role not in ('cpo', 'admin'):
            conn.execute('UPDATE users SET role = "cpo" WHERE id = ?', (current_user.id,))
            conn.commit()

        # Auto-seed data for any user visiting CPO for the first time
        seed_user_data(current_user.id, conn)

        owned = conn.execute('SELECT * FROM stations WHERE owner_id = ?', (current_user.id,)).fetchall()

        agg_row = conn.execute('''
            SELECT COALESCE(SUM(energy_kwh),0) as e, COALESCE(SUM(cost),0) as r, COUNT(*) as s 
            FROM charging_sessions cs 
            JOIN stations s ON cs.station_id = s.id 
            WHERE s.owner_id = ?
        ''', (current_user.id,)).fetchone()

        revenue = round(float(agg_row['r']), 2)
        energy = round(float(agg_row['e']), 1)
        sessions_count = int(agg_row['s'])

        cpo_stats = {
            'revenue': revenue,
            'kwh': energy,
            'sessions': sessions_count,
            'revenue_growth': 12.4,
            'network_uptime': 99.8,
            'active_bays': sum(s['available_bays'] or 0 for s in owned) if owned else 0,
            'total_bays': sum(s['total_bays'] or 0 for s in owned) if owned else 0
        }

        sessions_feed = conn.execute('''
            SELECT cs.*, s.name as station_name 
            FROM charging_sessions cs
            JOIN stations s ON cs.station_id = s.id
            WHERE s.owner_id = ? 
            ORDER BY cs.start_time DESC LIMIT 8
        ''', (current_user.id,)).fetchall()

        # Find top performing station
        top_station = conn.execute('''
            SELECT s.name, COUNT(cs.id) as cnt
            FROM stations s LEFT JOIN charging_sessions cs ON s.id = cs.station_id
            WHERE s.owner_id = ? GROUP BY s.id ORDER BY cnt DESC LIMIT 1
        ''', (current_user.id,)).fetchone()

        return render_template('cpo.html',
                             owned_stations=owned,
                             stats=cpo_stats,
                             recent_events=sessions_feed,
                             top_host_station=top_station['name'] if top_station else "No Stations")
    except Exception as e:
        import traceback
        traceback.print_exc()
        return redirect(url_for('map_page', error="CPO_ROUTE_FAIL"))
    finally:
        conn.close()

@app.route('/api/host/add_station', methods=['POST'])
@login_required
def host_add_station():
    conn = get_db_connection()
    try:
        bays = int(request.form['bays'])
        conn.execute(
            'INSERT INTO stations (name, address, lat, lng, connector_type, power_kw, total_bays, available_bays, owner_id, price_per_kwh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (request.form['name'], request.form['address'],
             float(request.form['lat']), float(request.form['lng']),
             request.form['connector'], int(request.form['power']),
             bays, bays, current_user.id,
             float(request.form.get('price', 15.0) or 15.0))
        )
        conn.commit()
    except Exception as e:
        print(f"ADD STATION ERROR: {e}")
    finally:
        conn.close()
    return redirect(url_for('cpo_dashboard'))

@app.route('/api/host/delete_station/<int:id>', methods=['POST'])
@login_required
def host_delete_station(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM charging_sessions WHERE station_id = ?', (id,))
    conn.execute('DELETE FROM stations WHERE id = ? AND owner_id = ?', (id, current_user.id))
    conn.commit()
    conn.close()
    return redirect(url_for('cpo_dashboard'))

# ---------- Analytics (v5.0) ----------

@app.route('/analytics-hub')
@login_required
def analytics_hub():
    conn = get_db_connection()
    try:
        # Seed data for this user if they have no stations
        seed_user_data(current_user.id, conn)

        agg = conn.execute('SELECT COUNT(*) as s, COALESCE(SUM(energy_kwh),0) as e, COALESCE(SUM(cost),0) as r FROM charging_sessions').fetchone()

        top_stations_raw = conn.execute('''
            SELECT s.id, s.name, s.power_kw, s.connector_type,
                   COUNT(cs.id) as sessions_count, 
                   COALESCE(SUM(cs.energy_kwh),0) as station_energy,
                   COALESCE(SUM(cs.cost),0) as station_revenue
            FROM stations s
            LEFT JOIN charging_sessions cs ON s.id = cs.station_id
            GROUP BY s.id
            ORDER BY station_revenue DESC
            LIMIT 8
        ''').fetchall()

        top_stations = []
        for s in top_stations_raw:
            sc = s['sessions_count'] or 0
            utilization = min(round(sc * 6.5, 1), 100)
            top_stations.append({
                'id': s['id'],
                'name': s['name'],
                'sessions': sc,
                'energy': round(s['station_energy'], 1),
                'revenue': round(s['station_revenue'], 0),
                'utilization': utilization,
                'power': s['power_kw'] or 50,
                'connector': s['connector_type'] or 'CCS2',
                'status': 'optimal' if utilization < 75 else 'peak'
            })

        total_sessions = int(agg['s'])
        total_kwh = round(float(agg['e']), 1)
        total_revenue = round(float(agg['r']), 0)

        analytics_data = {
            'total_sessions': total_sessions,
            'total_kwh': total_kwh,
            'total_revenue': total_revenue,
            'revenue_trend': '+14.2%',
            'energy_trend': '+8.5%',
            'top_station': top_stations[0]['name'] if top_stations else 'N/A'
        }
        return render_template('analytics.html', analytics=analytics_data, top_stations=top_stations)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return render_template('analytics.html', analytics={'total_sessions': 0, 'total_kwh': 0, 'total_revenue': 0, 'revenue_trend': '-', 'energy_trend': '-', 'top_station': 'N/A'}, top_stations=[])
    finally:
        conn.close()

@app.route('/api/analytics/filter')
@login_required
def analytics_filter():
    region = request.args.get('region', 'ALL')
    cycle = request.args.get('cycle', '30D')
    v = {'WEST': 1.2, 'SOUTH': 1.4, 'NORTH': 0.9, 'ALL': 1.0}.get(region, 1.0)
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    if cycle == '24H':
        labels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"]
    return jsonify({
        "labels": labels,
        "energy": [int(x * v) for x in [120, 150, 110, 180, 210, 190, 140]],
        "revenue": [int(x * v) for x in [2200, 2800, 1900, 3200, 3800, 3400, 2600]]
    })

# ---------- Social & UI Extras ----------

@app.route('/api/notifications')
@login_required
def notifications():
    conn = get_db_connection()
    notes = conn.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC', (current_user.id,)).fetchall()
    conn.close()
    return jsonify([dict(n) for n in notes])

@app.route('/admin')
@login_required
def admin_dashboard():
    # Only Admin can access
    if current_user.role != 'admin':
        return redirect(url_for('map_page'))
        
    conn = get_db_connection()
    try:
        # Global Aggregates
        u_count = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
        s_count = conn.execute('SELECT COUNT(*) FROM stations').fetchone()[0]
        sess_agg = conn.execute('SELECT COUNT(*) as s, SUM(cost) as r FROM charging_sessions').fetchone()
        
        all_stations = conn.execute('SELECT * FROM stations ORDER BY id DESC LIMIT 10').fetchall()
        recent_sessions = conn.execute('''
            SELECT cs.*, u.email as user_email, s.name as station_name 
            FROM charging_sessions cs
            JOIN users u ON u.id = 1 -- Placeholder for simplicity in admin view
            JOIN stations s ON cs.station_id = s.id
            ORDER BY cs.start_time DESC LIMIT 15
        ''').fetchall()

        admin_stats = {
            'total_users': u_count,
            'total_stations': s_count,
            'sessions_today': sess_agg['s'] or 0,
            'revenue': round(sess_agg['r'] or 0, 0),
            'sessions_chart': [45, 62, 38, 79, 51, 92, 68],
            'connector_dist': [65, 20, 10, 5]
        }
        
        return render_template('admin.html', stats=admin_stats, stations=all_stations, recent_sessions=recent_sessions)
    finally:
        conn.close()

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user, stats={'total_sessions': 12, 'total_kwh': 180, 'total_spend': 3240, 'co2_saved': 45}, favourites=[], history=[])

@app.route('/premium')
@login_required
def premium():
    return render_template('premium.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
