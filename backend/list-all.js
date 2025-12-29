const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
require('dotenv').config();

const listAllUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        console.log('\n--- Admins ---');
        const admins = await Admin.find({});
        admins.forEach(a => console.log(`- ${a.email} (${a.role})`));

        console.log('\n--- Users ---');
        const users = await User.find({});
        users.forEach(u => console.log(`- ${u.email} (${u.role})`));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

listAllUsers();
