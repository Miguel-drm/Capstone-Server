const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./connect.cjs');
const authRoutes = require('./routes/auth');

// Load environment variables from config.env
dotenv.config({ path: path.join(__dirname, 'config.env') });

// Connect to MongoDB
connectDB();

const app = express();

// CORS configuration
app.use(cors({
    origin: ['https://capstone-client.onrender.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Middleware
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Routes
app.use('/api/auth', authRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        res.json({ 
            status: 'ok', 
            message: 'Server is running',
            database: dbState === 1 ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error',
            message: 'Server health check failed',
            error: error.message
        });
    }
});

// Database test endpoint
app.get('/api/test/db', async (req, res) => {
    try {
        const userCount = await require('./models/User').countDocuments();
        res.json({ success: true, userCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 