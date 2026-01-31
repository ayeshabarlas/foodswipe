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

    let retries = 2; // Reduced retries
    while (retries > 0) {
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
            console.log(`🔌 Attempting to connect to: ${maskedUri} (Retries left: ${retries - 1})`);

            const conn = await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 20000,
                connectTimeoutMS: 20000,
                socketTimeoutMS: 60000,
                maxPoolSize: 10, // Increase pool size for parallel dashboard queries
                minPoolSize: 2
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
            retries--;
            console.error(`❌ MongoDB Connection Error: ${error.message}`);
            
            if (retries === 0) {
                console.log('🔄 Attempting fallback to local MongoDB...');
                try {
                    const localUri = "mongodb://localhost:27017/foodswipe";
                    const conn = await mongoose.connect(localUri, {
                        serverSelectionTimeoutMS: 5000
                    });
                    isConnected = true;
                    lastError = null;
                    console.log(`✅ Connected to LOCAL MongoDB: ${conn.connection.host}`);
                    return true;
                } catch (localErr) {
                    lastError = `Cloud: ${error.message}, Local: ${localErr.message}`;
                    console.error('❌ CRITICAL: Both Cloud and Local DB Connection Failed.');
                    return false;
                }
            }
            console.log('🔄 Retrying in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

const getDbStatus = () => ({
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    lastError
});

module.exports = { connectDB, getDbStatus };
