const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./connect.cjs');
const authRoutes = require('./routes/auth');
const uploadRouter = require('./routes/upload');

// Load environment variables from config.env
dotenv.config({ path: path.join(__dirname, 'config.env') });

// Connect to MongoDB
connectDB();

const app = express();

// CORS configuration
app.use(cors({
    origin: '*', // Allow all origins during development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRouter);

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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.stack : 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 