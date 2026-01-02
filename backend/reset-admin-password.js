// Script to reset admin password
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const resetAdminPassword = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        // Reset all admins in the Admin collection
        const admins = await Admin.find();
        console.log(`Found ${admins.length} admins.`);

        for (const admin of admins) {
            admin.password = 'admin123';
            await admin.save();
            console.log(`✅ Password reset for admin: ${admin.email}`);
        }

        console.log('\n✅ All admin passwords reset to: admin123');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
        process.exit(1);
    }
};

resetAdminPassword();
