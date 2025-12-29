const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const cleanAndName = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        const pass = '123456';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(pass, salt);

        // 1. Admin
        await Admin.findOneAndUpdate(
            { email: 'ayeshabarlas92@gmail.com' },
            { name: 'Ayesha Admin (Dashboard)', password: hashedPassword },
            { upsert: true }
        );
        console.log('✅ Admin updated: Ayesha Admin (Dashboard)');

        // 2. Restaurant
        await User.findOneAndUpdate(
            { email: 'ayeshabarlas92@gmail.com', role: 'restaurant' },
            { name: 'Ayesha Restaurant Account', password: hashedPassword },
            { upsert: true }
        );
        console.log('✅ Restaurant updated: Ayesha Restaurant Account');

        // 3. Customer (92)
        await User.findOneAndUpdate(
            { email: 'ayeshabarlas92@gmail.com', role: 'customer' },
            { name: 'Ayesha Customer (92)', password: hashedPassword },
            { upsert: true }
        );
        console.log('✅ Customer(92) updated: Ayesha Customer (92)');

        // 4. Customer (16)
        await User.findOneAndUpdate(
            { email: 'ayeshabarlas16@gmail.com', role: 'customer' },
            { name: 'Ayesha Customer (16)', password: hashedPassword },
            { upsert: true }
        );
        console.log('✅ Customer(16) updated: Ayesha Customer (16)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

cleanAndName();
