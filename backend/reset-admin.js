const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        const email = 'ayeshabarlas92@gmail.com';
        const password = '123456'; // Setting a simple known password

        let user = await User.findOne({ email });

        if (user) {
            console.log('👤 Admin user found:', user.name);
            console.log('🔑 Resetting password...');

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            user.role = 'admin'; // Ensure role is admin
            await user.save();

            console.log('✅ Password reset successfully!');
        } else {
            console.log('⚠️ Admin user not found. Creating new admin...');

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = await User.create({
                name: 'Admin User',
                email: email,
                password: hashedPassword,
                role: 'admin',
                phoneNumber: '00000000000'
            });

            console.log('✅ New admin user created!');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: ' + email);
        console.log('🔑 Password: ' + password);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

resetAdmin();
