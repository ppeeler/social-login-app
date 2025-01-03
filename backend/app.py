from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from auth import auth_bp
from users import users_bp

load_dotenv()

app = Flask(__name__)
CORS(app, origins=os.getenv('CORS_ORIGINS').split(','))

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(users_bp, url_prefix='/api')

@app.route('/api/test', methods=['GET'])
def test_route():
    app.logger.info('Test route called')
    response = {"message": "Backend is working!"}
    app.logger.info(f'Returning response: {response}')
    return jsonify(response)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(host=host, port=port, debug=debug)