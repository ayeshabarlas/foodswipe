// Debug script to check admin user in database
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const debugAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB\n');

        // Find admin user
        const adminUser = await User.findOne({
            email: 'ayeshabarlas92@gmail.com'
        });

        if (!adminUser) {
            console.log('❌ No user found with email: ayeshabarlas92@gmail.com');
            console.log('\nSearching for ANY admin users...');
            const allAdmins = await User.find({ role: 'admin' });
            console.log(`Found ${allAdmins.length} admin user(s):`);
            allAdmins.forEach(admin => {
                console.log(`  - ${admin.email} (${admin.name})`);
            });
            process.exit(1);
        }

        console.log('📋 Admin User Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('ID:', adminUser._id);
        console.log('Name:', adminUser.name);
        console.log('Email:', adminUser.email);
        console.log('Role:', adminUser.role);
        console.log('Phone:', adminUser.phone);
        console.log('Password Hash:', adminUser.password ? 'EXISTS' : 'MISSING');
        console.log('Password Length:', adminUser.password?.length || 0);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Test password
        console.log('🔐 Testing password "admin123"...');
        const testPassword = 'admin123';

        if (!adminUser.password) {
            console.log('❌ No password set for this user!');
            console.log('Setting password now...');
            adminUser.password = testPassword;
            await adminUser.save();
            console.log('✅ Password set successfully!');
        } else {
            const isMatch = await bcrypt.compare(testPassword, adminUser.password);
            console.log('Password Match:', isMatch ? '✅ YES' : '❌ NO');

            if (!isMatch) {
                console.log('\n⚠️  Password does not match! Resetting...');
                adminUser.password = testPassword;
                await adminUser.save();
                console.log('✅ Password reset to: admin123');
            }
        }

        console.log('\n✅ Admin user is ready!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: ayeshabarlas92@gmail.com');
        console.log('🔑 Password: admin123');
        console.log('🌐 Login: http://localhost:3000/admin/login');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

debugAdmin();
