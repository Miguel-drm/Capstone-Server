from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, DuplicateKeyError
from bson import ObjectId
import bcrypt
import jwt
import datetime
import os
from dotenv import load_dotenv
import certifi
import re
from functools import wraps
from flask_caching import Cache

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure Flask-Caching
cache = Cache(app, config={
    'CACHE_TYPE': 'simple',
    'CACHE_DEFAULT_TIMEOUT': 300
})

# MongoDB Configuration
MONGO_URI = "mongodb+srv://Capstone:CapstonePass@ac-j4kf1f6.gbc4i9h.mongodb.net/Capstone_Users?retryWrites=true&tls=true"
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is not set")

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is not set")

# Initialize MongoDB client with updated SSL configuration
client = MongoClient(
    MONGO_URI,
    tls=True,
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=False,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=30000,
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=30000,
    waitQueueTimeoutMS=2500,
    retryWrites=True,
    retryReads=True
)

# Initialize database and collection
db = client['Capstone_Users']
users_collection = db['users']

# Create indexes for better query performance
users_collection.create_index('email', unique=True)
users_collection.create_index('created_at')

def get_mongo_client():
    try:
        # Test the connection
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
        return client, db, users_collection
    except ConnectionFailure as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        raise

# Initialize MongoDB connection
try:
    client, db, users_collection = get_mongo_client()
except Exception as e:
    print(f"Failed to initialize MongoDB connection: {e}")
    raise

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.split(' ')[1]
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            cache_key = f"user_{data['user_id']}"
            current_user = cache.get(cache_key)
            if not current_user:
                current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
                if current_user:
                    cache.set(cache_key, current_user, timeout=300)
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def validate_email(email):
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

def validate_password(password):
    # At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$'
    return re.match(pattern, password) is not None

@app.route('/api/health', methods=['GET'])
@cache.cached(timeout=30)  # Cache health check for 30 seconds
def health_check():
    try:
        client.admin.command('ping')
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.datetime.utcnow().isoformat()
        }), 500

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not all([name, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        if not validate_password(password):
            return jsonify({'error': 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers'}), 400

        try:
            if users_collection.find_one({'email': email}):
                return jsonify({'error': 'Email already exists'}), 400
        except Exception as e:
            print(f"Database error during email check: {e}")
            return jsonify({'error': 'Database error occurred'}), 500

        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            user = {
                'name': name,
                'email': email,
                'password': hashed_password,
                'created_at': datetime.datetime.utcnow(),
                'last_login': None
            }

            result = users_collection.insert_one(user)
            user_id = str(result.inserted_id)

            token = jwt.encode({
                'user_id': user_id,
                'email': email,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
            }, JWT_SECRET, algorithm='HS256')

            # Cache the new user
            cache.set(f"user_{user_id}", user, timeout=300)

            return jsonify({
                'message': 'User created successfully',
                'token': token,
                'user': {
                    'id': user_id,
                    'name': name,
                    'email': email
                }
            }), 201

        except DuplicateKeyError:
            return jsonify({'error': 'Email already exists'}), 400
        except Exception as e:
            print(f"Error during user creation: {e}")
            return jsonify({'error': 'Error creating user'}), 500

    except Exception as e:
        print(f"Signup error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not all([email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        try:
            # Try to get user from cache first
            cache_key = f"user_email_{email}"
            user = cache.get(cache_key)
            if not user:
                user = users_collection.find_one({'email': email})
                if user:
                    cache.set(cache_key, user, timeout=300)

            if not user:
                return jsonify({'error': 'Invalid email or password'}), 401

            if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
                return jsonify({'error': 'Invalid email or password'}), 401

            # Update last login
            users_collection.update_one(
                {'_id': user['_id']},
                {'$set': {'last_login': datetime.datetime.utcnow()}}
            )

            # Update cache
            cache.set(f"user_{user['_id']}", user, timeout=300)
            cache.set(cache_key, user, timeout=300)

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
            print(f"Database error during login: {e}")
            return jsonify({'error': 'Database error occurred'}), 500

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/profile', methods=['GET'])
@token_required
@cache.cached(timeout=60)  # Cache profile for 1 minute
def get_profile(current_user):
    try:
        return jsonify({
            'user': {
                'id': str(current_user['_id']),
                'name': current_user['name'],
                'email': current_user['email'],
                'created_at': current_user['created_at'].isoformat(),
                'last_login': current_user.get('last_login', '').isoformat() if current_user.get('last_login') else None
            }
        }), 200
    except Exception as e:
        print(f"Profile error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')
