from flask import Blueprint, jsonify, request, current_app
import boto3
from datetime import datetime
import os
from botocore.config import Config

users_bp = Blueprint('users', __name__)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb',
    endpoint_url=os.getenv('DYNAMODB_ENDPOINT_URL'),
    region_name=os.getenv('AWS_DEFAULT_REGION'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    config=Config(retries={'max_attempts': 5})
)

users_table = dynamodb.Table(os.getenv('DYNAMODB_TABLE_NAME'))

@users_bp.route('/user', methods=['POST'])
def find_or_create_user():
    current_app.logger.info('Find or create user called')
    
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    data = request.json
    email = data.get('email')
    name = data.get('name')

    if not email or not name:
        return jsonify({
            'success': False,
            'error': 'Missing required fields'
        }), 400

    try:
        # Try to get existing user
        response = users_table.get_item(
            Key={'email': email}
        )
        
        # If user exists, return it
        if 'Item' in response:
            return jsonify({
                'success': True,
                'user': response['Item'],
                'created': False
            })
        
        # If user doesn't exist, create new user
        new_user = {
            'email': email,
            'name': name,
            'created_at': datetime.utcnow().isoformat()
        }
        
        users_table.put_item(Item=new_user)
        
        return jsonify({
            'success': True,
            'user': new_user,
            'created': True
        })

    except Exception as e:
        current_app.logger.error(f'DynamoDB error: {str(e)}')
        return jsonify({
            'success': False,
            'error': 'Database operation failed'
        }), 500

@users_bp.route('/user/<email>', methods=['GET'])
def get_user(email):
    current_app.logger.info(f'Get user called for email: {email}')
    
    try:
        response = users_table.get_item(
            Key={'email': email}
        )
        
        if 'Item' not in response:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
            
        return jsonify({
            'success': True,
            'user': response['Item']
        })
        
    except Exception as e:
        current_app.logger.error(f'DynamoDB error: {str(e)}')
        return jsonify({
            'success': False,
            'error': 'Database operation failed'
        }), 500
    
@users_bp.route('/user/color', methods=['POST'])
def update_favorite_color():
    current_app.logger.info('Update favorite color called')
    
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415
    
    data = request.json
    email = data.get('email')
    color = data.get('color')
    
    if not email or not color:
        return jsonify({
            'success': False,
            'error': 'Missing required fields'
        }), 400
    
    try:
        # Update user with new color
        response = users_table.update_item(
            Key={'email': email},
            UpdateExpression='SET favoriteColor = :color',
            ExpressionAttributeValues={':color': color},
            ReturnValues='ALL_NEW'
        )
        
        if 'Attributes' in response:
            return jsonify({
                'success': True,
                'user': response['Attributes']
            })
        
        return jsonify({
            'success': False,
            'error': 'User not found'
        }), 404
        
    except Exception as e:
        current_app.logger.error(f'DynamoDB error: {str(e)}')
        return jsonify({
            'success': False,
            'error': 'Database operation failed'
        }), 500