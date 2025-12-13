// Script to create admin user for FoodSwipe admin dashboard
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        // Check if admin user already exists
        const existingAdmin = await User.findOne({
            email: 'ayeshabarlas92@gmail.com',
            role: 'admin'
        });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists with this email');
            console.log('Email:', existingAdmin.email);
            console.log('Name:', existingAdmin.name);
            console.log('Role:', existingAdmin.role);
            process.exit(0);
        }

        // Create new admin user
        const adminUser = await User.create({
            name: 'Ayesha Barlas',
            email: 'ayeshabarlas92@gmail.com',
            password: 'admin123', // Will be hashed by pre-save hook
            role: 'admin',
            phone: '+923001234567',
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', adminUser.email);
        console.log('🔑 Password: admin123');
        console.log('👤 Name:', adminUser.name);
        console.log('🎭 Role:', adminUser.role);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🌐 Login at: http://localhost:3000/admin/login');
        console.log('\n⚠️  Please change the password after first login!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    }
};

createAdminUser();
