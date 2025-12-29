const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function verifyPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const admin = await Admin.findOne({ email: 'ayeshabarlas636@gmail.com' });

        if (!admin) {
            console.log('Admin not found');
            await mongoose.disconnect();
            return;
        }

        console.log('Admin found:', admin.email);
        console.log('Stored password hash:', admin.password);

        // Test password
        const testPassword = 'admin123';
        const isMatch = await bcrypt.compare(testPassword, admin.password);

        console.log('\nPassword test:');
        console.log('Testing password:', testPassword);
        console.log('Match result:', isMatch ? '✅ CORRECT' : '❌ WRONG');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyPassword();
