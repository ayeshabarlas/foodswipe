const mongoose = require('mongoose');

let isConnected = false;
let lastError = null;

const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return true;
    }

    try {
        let mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            lastError = 'MONGO_URI is missing';
            console.error('CRITICAL: MONGO_URI is not defined!');
            return false;
        }

        // Mask URI for logging
        const maskedUri = mongoUri.replace(/\/\/.*@/, '//****:****@');
        console.log(`🔌 Attempting to connect to: ${maskedUri}`);

        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        lastError = null;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
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
