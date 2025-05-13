from flask import Blueprint, request, jsonify
from db import get_collection
import bcrypt
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Blueprint
auth = Blueprint('auth', __name__)

# JWT Secret Key
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')  # Make sure to set this in .env

def generate_token(user_id):
    """Generate JWT token for authenticated user"""
    payload = {
        'user_id': str(user_id),
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

@auth.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'name']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Get users collection
        users = get_collection('users')

        # Check if user already exists
        if users.find_one({'email': data['email']}):
            return jsonify({'error': 'Email already registered'}), 400

        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())

        # Create user document
        user = {
            'email': data['email'],
            'password': hashed_password,
            'name': data['name'],
            'created_at': datetime.utcnow()
        }

        # Insert user into database
        result = users.insert_one(user)
        
        # Generate token
        token = generate_token(result.inserted_id)

        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': {
                'id': str(result.inserted_id),
                'email': data['email'],
                'name': data['name']
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400

        # Get users collection
        users = get_collection('users')

        # Find user by email
        user = users.find_one({'email': data['email']})
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        # Verify password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Generate token
        token = generate_token(user['_id'])

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name']
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Token verification decorator
def token_required(f):
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode token
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            
            # Get user from database
            users = get_collection('users')
            user = users.find_one({'_id': payload['user_id']})
            
            if not user:
                return jsonify({'error': 'User not found'}), 401

            # Add user to request context
            request.user = user
            
            return f(*args, **kwargs)

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    decorated.__name__ = f.__name__
    return decorated 