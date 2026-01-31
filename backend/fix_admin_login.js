const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

// Load env from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function fixAdmin() {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in environment variables');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'superadmin@foodswipe.com';
        const password = 'adminpassword123'; // Default reset password
        const role = 'super-admin';

        console.log(`Checking for admin: ${email}...`);

        // Check Admin collection
        let admin = await Admin.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (admin) {
            console.log(`Found in Admin collection. Updating password and role...`);
            admin.password = password;
            admin.role = role;
            admin.status = 'active';
            await admin.save();
            console.log('Admin updated successfully.');
        } else {
            console.log(`Not found in Admin collection. Checking User collection...`);
            let user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

            if (user) {
                console.log(`Found in User collection. Updating role and password...`);
                // Note: user model might have different structure, but we'll try to ensure it has the rights
                user.role = role;
                user.password = password;
                await user.save();
                console.log('User updated to super-admin successfully.');
            } else {
                console.log(`Creating new Super Admin...`);
                await Admin.create({
                    name: 'Super Admin',
                    email,
                    password,
                    role,
                    status: 'active'
                });
                console.log('New Super Admin created successfully.');
            }
        }

        console.log('\n======================================');
        console.log('LOGIN CREDENTIALS:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('======================================\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixAdmin();
