from flask import Flask, jsonify
from flask_cors import CORS
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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(host=host, port=port, debug=debug)