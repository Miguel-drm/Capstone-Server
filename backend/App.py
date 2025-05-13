from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
import bcrypt
import jwt
import datetime
import os
from dotenv import load_dotenv
import certifi

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# MongoDB Configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb+srv://Capstone:CapstonePass@capstone.gbc4i9h.mongodb.net/?retryWrites=true&w=majority&appName=Capstone')
client = MongoClient(
    MONGO_URI,
    server_api=ServerApi('1'),
    serverSelectionTimeoutMS=5000,
    tlsCAFile=certifi.where()
)
db = client['Capstone_Users']
users_collection = db['users']

# Test MongoDB connection
try:
    client.admin.command('ping')
    print("Successfully connected to MongoDB!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your_secret_key_here')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not all([name, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Check if user already exists
        if users_collection.find_one({'email': email}):
            return jsonify({'error': 'Email already exists'}), 400

        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Create user document
        user = {
            'name': name,
            'email': email,
            'password': hashed_password,
            'created_at': datetime.datetime.utcnow()
        }

        # Insert user into database
        result = users_collection.insert_one(user)
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': str(result.inserted_id),
            'email': email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'message': 'User created successfully',
            'token': token
        }), 201

    except Exception as e:
        print(f"Signup error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email')
        password = data.get('password')

        if not all([email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Find user by email
        user = users_collection.find_one({'email': email})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({'error': 'Invalid password'}), 401

        # Generate JWT token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'name': user['name'],
                'email': user['email']
            }
        }), 200

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 