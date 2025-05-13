from flask import Flask, request, jsonify
from flask_cors import CORS
from db import get_db, get_collection
from auth import auth, token_required
import os
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register auth blueprint
app.register_blueprint(auth, url_prefix='/api/auth')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Basic route for testing
@app.route('/api/test', methods=['GET'])
def test_route():
    return jsonify({"message": "Backend is working!"})

# Protected route example
@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile():
    user = request.user
    return jsonify({
        'user': {
            'id': str(user['_id']),
            'email': user['email'],
            'name': user['name'],
            'created_at': user['created_at'].isoformat() if 'created_at' in user else None
        }
    })

# Update user profile
@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile():
    try:
        user = request.user
        data = request.get_json()
        
        # Fields that can be updated
        allowed_fields = ['name']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
            
        users = get_collection('users')
        users.update_one(
            {'_id': user['_id']},
            {'$set': update_data}
        )
        
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get all users (admin only)
@app.route('/api/users', methods=['GET'])
@token_required
def get_users():
    try:
        users_collection = get_collection('users')
        users = list(users_collection.find({}, {
            'password': 0,  # Exclude password from response
            '_id': 1,
            'email': 1,
            'name': 1,
            'created_at': 1
        }))
        
        # Convert ObjectId to string
        for user in users:
            user['_id'] = str(user['_id'])
            if 'created_at' in user:
                user['created_at'] = user['created_at'].isoformat()
                
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        db = get_db()
        db.command('ping')
        
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)