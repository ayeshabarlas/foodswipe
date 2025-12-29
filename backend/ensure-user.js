const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ensureCustomer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        const email = 'ayeshabarlas16@gmail.com';
        let user = await User.findOne({ email, role: 'customer' });

        if (!user) {
            console.log(`👤 Creating customer ${email}...`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('123456', salt);
            user = await User.create({
                name: 'Ayesha Customer',
                email: email,
                password: hashedPassword,
                phone: '03001234567',
                role: 'customer'
            });
            console.log('✅ Customer created!');
        } else {
            console.log(`👤 Customer ${email} already exists.`);
            user.password = await bcrypt.hash('123456', await bcrypt.genSalt(10));
            await user.save();
            console.log('✅ Customer password reset to 123456');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

ensureCustomer();
