# ══════════════════════════════════════════════════════════════════════
#   VAHANSETU - ENTERPRISE BACKEND HUB (v6.0 Modular)
#   ──────────────────────────────────────────────────────────────────────
#   Core: Flask / Modular Blueprints / Security Protocol
#   ══════════════════════════════════════════════════════════════════════

import os
from flask import Flask, jsonify, request, render_template, send_from_directory, redirect, url_for
from flask_cors import CORS
from flask_login import LoginManager, current_user, logout_user
from dotenv import load_dotenv

# Import Modular Blueprints
from routes.auth import auth_bp, User
from routes.fleet import fleet_bp
from routes.stations import stations_bp
from routes.trip import trip_bp
from routes.user import user_bp
from routes.premium import premium_bp
from routes.analytics import analytics_bp
from routes.host import host_bp
from database import get_db_connection, init_db
from utils import verify_jwt

# Load Environment Identity
load_dotenv()

app = Flask(__name__, static_folder='client/dist', static_url_path='/', template_folder='client/dist')
app.config['JWT_SECRET'] = os.getenv('JWT_SECRET', 'fallback-secret-2026')
app.secret_key = os.getenv('SECRET_KEY', 'vs-ultra-secure-key-2026')
CORS(app)

# Initialize Identity Protocol
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    conn = get_db_connection()
    u = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if u: return User(u['id'], u['name'], u['email'], u['role'], u['is_premium'])
    return None

# Register System Modules (Blueprints)
app.register_blueprint(auth_bp)
app.register_blueprint(fleet_bp)
app.register_blueprint(stations_bp)
app.register_blueprint(trip_bp)
app.register_blueprint(user_bp)
app.register_blueprint(premium_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(host_bp)

# ── GLOBAL ERROR PROTOCOL ──
@app.errorhandler(401)
def unauthorized(e):
    return jsonify({'status': 'error', 'message': 'Authentication required', 'code': 401}), 401

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({'status': 'error', 'message': 'Resource not found', 'code': 404}), 404
    return render_template("index.html") # Fallback for React routing

@app.errorhandler(500)
def server_error(e):
    return jsonify({'status': 'error', 'message': 'Internal node failure', 'code': 500}), 500

# ── SECURITY MIDDLEWARE ──
@app.before_request
def validate_nexus_token():
    public = ['/', '/login', '/signup', '/logout', '/api/me']
    if request.path in public or request.path.startswith('/static/'): return
    
    if current_user.is_authenticated:
        token = request.cookies.get('vs_jwt_nexus')
        if not token or not verify_jwt(token):
            logout_user()
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Security Protocol: Invalid Session'}), 401
            return redirect(url_for('serve'))

# ── REACT STATIC SERVICE ──
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    return render_template("index.html")

if __name__ == '__main__':
    init_db()
    port = int(os.getenv('PORT', 5000))
    app.run(debug=os.getenv('DEBUG', 'True') == 'True', host='0.0.0.0', port=port)
