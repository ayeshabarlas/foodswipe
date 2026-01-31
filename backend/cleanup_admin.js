const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function cleanupAndFix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'superadmin@foodswipe.com';
        const password = 'adminpassword123';

        // 1. Delete from User collection to avoid duplicates/confusion
        const deleteResult = await User.deleteMany({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        console.log(`Deleted ${deleteResult.deletedCount} records from User collection for ${email}`);

        // 2. Clear all existing admins with this email to be safe
        await Admin.deleteMany({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        // 3. Create fresh Super Admin in Admin collection
        const newAdmin = new Admin({
            name: 'Super Admin',
            email: email.toLowerCase(),
            password: password,
            role: 'super-admin',
            status: 'active'
        });

        await newAdmin.save();
        console.log('Fresh Super Admin created in Admin collection.');

        console.log('\n======================================');
        console.log('FINAL LOGIN CREDENTIALS:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('======================================\n');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

cleanupAndFix();
