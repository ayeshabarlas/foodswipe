const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        let mongoUri = process.env.MONGO_URI;

        // Logic for MongoMemoryServer removed to ensure real database usage
        // if (process.env.MONGO_URI === 'mongodb://localhost:27017/foodswipe') { ... }

        const conn = await mongoose.connect(mongoUri);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
