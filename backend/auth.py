# auth.py
from flask import Blueprint, jsonify, request, current_app
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, timedelta, timezone
import jwt
import os

auth_bp = Blueprint('auth', __name__)

def create_access_token(user_data, expires_delta=timedelta(hours=1)):
    payload = {
        'user': user_data,
        'exp': datetime.now(timezone.utc) + expires_delta,
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, os.getenv('JWT_SECRET_KEY'), algorithm='HS256')

@auth_bp.route('/auth/google', methods=['POST', 'OPTIONS'])
def google_auth():
    current_app.logger.info('Google auth called')
    
    if request.method == 'OPTIONS':
        return '', 204

    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415
        
    token = request.json.get('token')
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    
    try:
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), client_id)
            
        user_data = {
            'email': idinfo['email'],
            'name': idinfo['name']
        }
            
        access_token = create_access_token(user_data)
            
        return jsonify({
            'success': True,
            'accessToken': access_token,
            'user': {
                'email': idinfo['email'],
                'name': idinfo['name']
            }
        })
        
    except ValueError as e:
        current_app.logger.error(f'Token verification failed: {e}')
        return jsonify({'success': False, 'error': 'Invalid token'}), 401

@auth_bp.route('/auth/refresh', methods=['POST'])
def refresh_token():
    current_app.logger.info('Token refresh called')
    
    token = request.headers.get('Authorization')
    if not token or not token.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
        
    token = token.split(' ')[1]
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY'), algorithms=['HS256'])
        new_token = create_access_token(payload['user'])
        return jsonify({'accessToken': new_token})
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401