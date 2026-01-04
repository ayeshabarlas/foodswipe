const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');
require('dotenv').config();

const clearAdmins = async () => {
    try {
        await connectDB();
        const result = await Admin.deleteMany({});
        console.log(`✅ Cleared ${result.deletedCount} admin accounts.`);
        process.exit();
    } catch (error) {
        console.error('❌ Error clearing admins:', error);
        process.exit(1);
    }
};

clearAdmins();
