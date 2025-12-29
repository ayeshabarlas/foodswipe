const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        const email = 'ayeshabarlas92@gmail.com';
        const admin = await Admin.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (admin) {
            console.log('👤 Admin found in Admin model:');
            console.log('Name:', admin.name);
            console.log('Email:', admin.email);
            console.log('Role:', admin.role);
            console.log('Hashed Password:', admin.password);
        } else {
            console.log('❌ Admin NOT found in Admin model.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkAdmin();
