from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from database import get_db_connection

premium_bp = Blueprint('premium', __name__)

@premium_bp.route('/premium/verify', methods=['POST'])
@login_required
def premium_verify():
    conn = get_db_connection()
    conn.execute('UPDATE users SET is_premium = 1 WHERE id = ?', (current_user.id,))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'message': 'Quantum Identity Verified'})

@premium_bp.route('/premium/cancel', methods=['POST'])
@login_required
def premium_cancel():
    conn = get_db_connection()
    conn.execute('UPDATE users SET is_premium = 0 WHERE id = ?', (current_user.id,))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'message': 'Identity Reverted to Baseline'})
