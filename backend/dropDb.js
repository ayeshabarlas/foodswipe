const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dropDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
        await mongoose.connection.dropDatabase();
        console.log('Database Dropped');
        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

dropDB();
