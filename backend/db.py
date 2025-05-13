from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv('MONGODB_URI')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'Capstone_Users')

if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

# Create MongoDB client with timeout settings
client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000,  # 5 second timeout
    connectTimeoutMS=10000,         # 10 second timeout
    socketTimeoutMS=45000,          # 45 second timeout
)

def test_connection():
    """Test the MongoDB connection"""
    try:
        # The ismaster command is cheap and does not require auth
        client.admin.command('ismaster')
        logger.info("MongoDB connection successful")
        return True
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error(f"MongoDB connection failed: {str(e)}")
        return False

# Test connection on startup
if not test_connection():
    raise ConnectionError("Failed to connect to MongoDB")

# Get database
db = client.get_database(MONGODB_DB_NAME)

# Collections
users = db.users

def get_db():
    """Return database instance"""
    return db

def get_collection(collection_name):
    """Get a specific collection by name"""
    try:
        return db[collection_name]
    except Exception as e:
        logger.error(f"Error getting collection {collection_name}: {str(e)}")
        raise

# Initialize collections if they don't exist
def init_collections():
    """Initialize collections with indexes"""
    try:
        # Users collection
        if 'users' not in db.list_collection_names():
            db.create_collection('users')
            logger.info("Created users collection")
        
        # Create indexes
        users.create_index('email', unique=True)
        logger.info("Created email index on users collection")
        
    except Exception as e:
        logger.error(f"Error initializing collections: {str(e)}")
        raise

# Initialize collections on startup
init_collections() 