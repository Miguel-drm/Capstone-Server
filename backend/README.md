# Backend API Server

This is a Flask-based REST API server with MongoDB integration for user authentication and management.

## Features

- User registration and login with JWT authentication
- Password hashing with bcrypt
- MongoDB integration
- Input validation
- Error handling
- CORS support
- Health check endpoint
- User profile endpoint

## Environment Setup

1. Create a `.env` file in the backend directory with the following variables:
   ```
   # MongoDB Configuration
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

   # JWT Configuration
   JWT_SECRET=your_secure_jwt_secret_key_here

   # Server Configuration
   PORT=5000
   FLASK_ENV=development

   # Cache Configuration
   CACHE_TYPE=simple
   CACHE_DEFAULT_TIMEOUT=300
   ```

2. Replace the placeholder values with your actual configuration:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random string for JWT token signing
   - `PORT`: The port your server will run on
   - `FLASK_ENV`: Set to 'development' for local development

## Security Notes

1. Never commit the `.env` file to version control
2. Keep your JWT_SECRET secure and unique
3. Use strong passwords for your MongoDB user
4. Regularly rotate your secrets and passwords

## Prerequisites

- Python 3.8 or higher
- MongoDB Atlas account
- pip (Python package manager)

## Setup

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the backend directory with the following variables:
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_jwt_secret
   PORT=5000
   FLASK_ENV=development
   ```

## Running the Server

```bash
python App.py
```

The server will start on http://localhost:5000

## API Endpoints

### Health Check
- `GET /api/health`
- Returns server and database status

### User Registration
- `POST /api/signup`
- Body: `{ "name": "string", "email": "string", "password": "string" }`
- Returns: JWT token and user info

### User Login
- `POST /api/login`
- Body: `{ "email": "string", "password": "string" }`
- Returns: JWT token and user info

### Get User Profile
- `GET /api/profile`
- Headers: `Authorization: Bearer <token>`
- Returns: User profile information

## Security Features

- Password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- JWT token-based authentication
- Secure password hashing with bcrypt
- Input validation and sanitization
- Environment variable configuration
- CORS protection

## Error Handling

The API returns appropriate HTTP status codes and error messages:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 500: Internal Server Error 