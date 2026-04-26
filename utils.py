import jwt
from flask import current_app, request, jsonify, redirect, url_for, flash
from flask_login import current_user, logout_user
from datetime import datetime
from mailer import send_vahan_email
import math

def verify_jwt(token):
    try:
        data = jwt.decode(token, current_app.config['JWT_SECRET'], algorithms=['HS256'])
        return data
    except:
        return None

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return round(R * 2 * math.asin(math.sqrt(a)), 2)

def standard_response(success, message, data=None, code=200):
    return jsonify({
        'success': success,
        'message': message,
        'data': data
    }), code
