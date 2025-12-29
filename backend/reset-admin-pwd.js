const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database');

        const email = 'ayeshabarlas636@gmail.com';
        const newPassword = 'admin123';

        const admin = await Admin.findOne({ email });

        if (!admin) {
            console.log('❌ Admin not found with email:', email);
            await mongoose.disconnect();
            return;
        }

        console.log('✅ Found admin:', admin.name);

        // Update password (will be hashed by pre-save hook)
        admin.password = newPassword;
        await admin.save();

        console.log('✅ Password reset successfully!');
        console.log('\nYou can now login with:');
        console.log('Email:', email);
        console.log('Password:', newPassword);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

resetPassword();
