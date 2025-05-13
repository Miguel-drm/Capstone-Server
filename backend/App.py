from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import bcrypt
import jwt
import datetime
import os
from dotenv import load_dotenv
import certifi
import ssl

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Capstone:CapstonePass@ac-j4kf1f6.gbc4i9h.mongodb.net/Capstone_Users?retryWrites=true")

# Initialize MongoDB client as None
client = None
db = None
users_collection = None

def get_mongo_client():
    global client, db, users_collection
    if client is None:
        try:
            client = MongoClient(
                MONGO_URI,
                tls=True,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=5000
            )
            # Test the connection
            client.admin.command('ping')
            print("✅ Successfully connected to MongoDB Atlas!")
            
            # Initialize database and collection
            db = client['Capstone_Users']
            users_collection = db['users']
        except Exception as e:
            print(f"❌ Error connecting to MongoDB: {e}")
            raise
    return client, db, users_collection

# Initialize MongoDB connection
try:
    client, db, users_collection = get_mongo_client()
except Exception as e:
    print(f"Failed to initialize MongoDB connection: {e}")

# JWT secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your_secret_key_here')

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Test MongoDB connection
        client.admin.command('ping')
        return jsonify({"status": "healthy", "database": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "database": "disconnected", "error": str(e)}), 500

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        # Ensure MongoDB connection
        if client is None:
            client, db, users_collection = get_mongo_client()
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not all([name, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        if users_collection.find_one({'email': email}):
            return jsonify({'error': 'Email already exists'}), 400

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        user = {
            'name': name,
            'email': email,
            'password': hashed_password,
            'created_at': datetime.datetime.utcnow()
        }

        result = users_collection.insert_one(user)

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
        # Ensure MongoDB connection
        if client is None:
            client, db, users_collection = get_mongo_client()
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email')
        password = data.get('password')

        if not all([email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        user = users_collection.find_one({'email': email})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({'error': 'Invalid password'}), 401

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
