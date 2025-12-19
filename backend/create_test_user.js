const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

async function createMultiRoleUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'multitest@example.com';
        const password = 'Password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Delete existing if any
        await User.deleteMany({ email });

        // Create Customer
        await User.create({
            name: 'Test Customer',
            email,
            password: hashedPassword,
            phone: '3001111111',
            role: 'customer'
        });

        // Create Restaurant
        await User.create({
            name: 'Test Restaurant',
            email,
            password: hashedPassword,
            phone: '3001111111',
            role: 'restaurant'
        });

        console.log('Multi-role user created: multitest@example.com / Password123');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

createMultiRoleUser();
