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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
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