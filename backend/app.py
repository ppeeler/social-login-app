from flask import Flask, jsonify, request
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=os.getenv('CORS_ORIGINS').split(','))

@app.route('/api/test', methods=['GET'])
def test_route():
    app.logger.info('Test route called')
    response = {"message": "Backend is working!"}
    app.logger.info(f'Returning response: {response}')
    return jsonify(response)

@app.route('/api/auth/google', methods=['POST', 'OPTIONS'])
def google_auth():
    if request.method == 'OPTIONS':
        return '', 204
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415
    
    token = request.json.get('token')
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    
    try:
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), client_id)
            
        return jsonify({
            'success': True,
            'user': {
                'email': idinfo['email'],
                'name': idinfo['name']
            }
        })
    
    except ValueError as e:
        app.logger.error(f'Token verification failed: {e}')
        return jsonify({'success': False, 'error': 'Invalid token'}), 401

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(host=host, port=port, debug=debug)