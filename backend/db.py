from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# MongoDB connection string
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://Capstone:CapstonePass@capstone.gbc4i9h.mongodb.net/?retryWrites=true&w=majority&appName=Capstone')

# Create MongoDB client
client = MongoClient(MONGODB_URI)

# Get database
db = client.get_database('Capstone_Users')  # Replace with your database name

# Collections
users = db.users
# Add other collections as needed

def get_db():
    """Return database instance"""
    return db

def get_collection(collection_name):
    """Get a specific collection by name"""
    return db[collection_name] 