from pymongo import MongoClient

uri = "mongodb+srv://Capstone:CapstonePass@ac-j4kf1f6.gbc4i9h.mongodb.net/Capstone_Users?retryWrites=true&tls=true"

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    print(client.server_info())  # Triggers the connection
    print("✅ Connection to MongoDB succeeded!")
except Exception as e:
    print("❌ Connection failed:", e)
