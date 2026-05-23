from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime

auth_bp = Blueprint('auth', __name__)

# Demo user store (for now)
_USERS = {"admin": "password"}


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    if username in _USERS and _USERS[username] == password:
        payload = {
            'sub': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }
        token = jwt.encode(payload, current_app.config.get('SECRET_KEY', 'devkey'), algorithm='HS256')
        return jsonify({'token': token})
    return jsonify({'error': 'invalid credentials'}), 401
