const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const verifyAdminPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        const email = 'ayeshabarlas92@gmail.com';
        const passwordToTest = '123456';

        const admin = await Admin.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (admin) {
            const isMatch = await bcrypt.compare(passwordToTest, admin.password);
            console.log(`Password test for ${email}: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        } else {
            console.log('❌ Admin NOT found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

verifyAdminPassword();
