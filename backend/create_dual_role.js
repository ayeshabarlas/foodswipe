const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

async function createDualRoleUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'dualrole@example.com';
        const password = 'Password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Delete existing to start fresh
        await User.deleteMany({ email });

        // 1. Create Customer
        await User.create({
            name: 'Dual Customer',
            email,
            password: password, // pre-save hook will hash it
            phone: '3009999991',
            role: 'customer'
        });

        // 2. Create Restaurant
        await User.create({
            name: 'Dual Restaurant',
            email,
            password: password,
            phone: '3009999992',
            role: 'restaurant'
        });

        console.log('Dual-role users created: dualrole@example.com / Password123');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

createDualRoleUsers();
