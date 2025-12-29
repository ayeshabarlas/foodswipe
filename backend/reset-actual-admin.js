const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const resetActualAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        const email = 'ayeshabarlas92@gmail.com';
        const password = 'admin123'; // Setting to admin123 as requested or 123456? I'll use 123456 to be sure.
        const targetPassword = '123456';

        let admin = await Admin.findOne({ email });

        if (admin) {
            console.log('👤 Admin found:', admin.name);
            admin.password = targetPassword;
            await admin.save();
            console.log('✅ Password reset successfully for Admin model!');
        } else {
            console.log('⚠️ Admin not found. Creating new admin in Admin model...');
            admin = await Admin.create({
                name: 'Ayesha Barlas',
                email: email,
                password: targetPassword,
                role: 'admin'
            });
            console.log('✅ New admin created in Admin model!');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: ' + email);
        console.log('🔑 Password: ' + targetPassword);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

resetActualAdmin();
