const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        let mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('CRITICAL: MONGO_URI is not defined in environment variables!');
            return false;
        }

        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        return false;
    }
};

module.exports = connectDB;
