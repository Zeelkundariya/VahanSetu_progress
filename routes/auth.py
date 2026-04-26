from flask import Blueprint, request, jsonify, redirect, url_for, flash, current_app
from flask_login import login_user, logout_user, current_user, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
import time
from database import get_db_connection
from mailer import send_vahan_email

auth_bp = Blueprint('auth', __name__)

class User(UserMixin):
    def __init__(self, id, name, email, role, is_premium):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.is_premium = is_premium

@auth_bp.route('/api/me')
def api_me():
    if current_user.is_authenticated:
        return jsonify({
            'id': current_user.id, 
            'name': current_user.name, 
            'email': current_user.email, 
            'role': current_user.role, 
            'is_premium': current_user.is_premium
        })
    return jsonify(None), 401

@auth_bp.route('/signup', methods=['POST'])
def signup():
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

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (request.form.get('email', '') or data.get('email', '')).strip().lower()
    password = (request.form.get('password', '') or data.get('password', ''))
    is_api = request.is_json or 'application/json' in request.headers.get('Accept', '')

    if not email or not password:
        if is_api:
            return jsonify({'success': False, 'message': 'Credentials required.'}), 400
        return redirect('/')

    conn = get_db_connection()
    u = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if u and check_password_hash(u['password'], password):
        token = jwt.encode({
            'user_id': u['id'], 
            'email': u['email'], 
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, current_app.config['JWT_SECRET'], algorithm='HS256')
        
        login_user(User(u['id'], u['name'], u['email'], u['role'], u['is_premium']))
        
        try:
            conn = get_db_connection()
            conn.execute('INSERT INTO security_logs (user_id, ip_address, device_agent, status) VALUES (?, ?, ?, ?)',
                         (u['id'], request.remote_addr, request.headers.get('User-Agent', 'Unknown'), 'Success'))
            conn.commit(); conn.close()
            send_vahan_email(to_email=email, subject="🔔 VahanSetu — Secure Login Detected", title="Login Successful", message=f"Session initiated from {request.remote_addr}.", action_text="Open Dashboard")
        except: pass
        
        if is_api:
            resp = jsonify({'success': True, 'user': {'id': u['id'], 'name': u['name'], 'email': u['email'], 'role': u['role'], 'is_premium': u['is_premium']}})
        else:
            resp = redirect('/')
        resp.set_cookie('vs_jwt_nexus', token, httponly=True, samesite='Lax')
        return resp
    
    time.sleep(1.0)
    return jsonify({'success': False, 'message': 'Invalid credentials.'}), 401

@auth_bp.route('/logout')
def logout():
    logout_user()
    resp = jsonify({'success': True}) if request.is_json else redirect('/')
    resp.delete_cookie('vs_jwt_nexus')
    return resp
