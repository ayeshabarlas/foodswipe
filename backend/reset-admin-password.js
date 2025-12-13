// Script to reset admin password
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const resetAdminPassword = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        // Find admin user
        const adminUser = await User.findOne({
            email: 'ayeshabarlas92@gmail.com',
            role: 'admin'
        });

        if (!adminUser) {
            console.log('❌ Admin user not found!');
            console.log('Run create-admin.js first to create the admin user.');
            process.exit(1);
        }

        // Update password
        const newPassword = 'admin123';
        adminUser.password = newPassword; // Will be hashed by pre-save hook
        await adminUser.save();

        console.log('\n✅ Admin password reset successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', adminUser.email);
        console.log('🔑 New Password: admin123');
        console.log('👤 Name:', adminUser.name);
        console.log('🎭 Role:', adminUser.role);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🌐 Login at: http://localhost:3000/admin/login\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
        process.exit(1);
    }
};

resetAdminPassword();
