const mongoose = require('mongoose');

// Disable buffering globally to prevent long-running timeouts
// This makes queries fail fast if the DB is not connected
mongoose.set('bufferCommands', false);

let isConnected = false;
let lastError = null;

const connectDB = async () => {
    // If already connected, don't reconnect
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return true;
    }

    try {
        let mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            lastError = 'MONGO_URI is missing';
            console.error('CRITICAL: MONGO_URI is not defined!');
            return false;
        }

        // Clean the URI (Render common mistakes fix)
        mongoUri = mongoUri.trim();
        if (mongoUri.startsWith('MONGO_URI=')) {
            mongoUri = mongoUri.replace('MONGO_URI=', '');
        }

        // Mask URI for logging
        const maskedUri = mongoUri.replace(/\/\/.*@/, '//****:****@');
        console.log(`🔌 Attempting to connect to: ${maskedUri}`);

        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000, // Wait 10s for server selection
            connectTimeoutMS: 15000,        // Wait 15s for initial connection
            socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
            family: 4                       // Use IPv4, skip trying IPv6
        });

        isConnected = true;
        lastError = null;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        // Handle connection events
        mongoose.connection.on('error', err => {
            console.error('❌ MongoDB Runtime Error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB Disconnected. Attempting to reconnect...');
            isConnected = false;
        });

        return true;
    } catch (error) {
        isConnected = false;
        lastError = error.message;
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        return false;
    }
};

const getDbStatus = () => ({
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    lastError
});

module.exports = { connectDB, getDbStatus };
