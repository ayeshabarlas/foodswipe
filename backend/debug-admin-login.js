const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });

const debugLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'ayeshabarlas92@gmail.com';

        // Check all users with this email
        const users = await User.find({ email });
        console.log(`Found ${users.length} users with email ${email}:`);

        for (const user of users) {
            console.log(`- ID: ${user._id}, Role: ${user.role}, Name: ${user.name}`);
            const isMatch = await bcrypt.compare('123456', user.password);
            console.log(`  Password '123456' match: ${isMatch}`);
        }

        // Check specifically for admin
        const adminUser = await User.findOne({ email, role: 'admin' });
        if (!adminUser) {
            console.log('CRITICAL: No user found with role "admin" and this email!');

            // Fix: If a user exists but wrong role, or create new
            if (users.length > 0) {
                console.log('Updating first found user to admin role...');
                users[0].role = 'admin';
                // Reset password too just in case
                const salt = await bcrypt.genSalt(10);
                users[0].password = await bcrypt.hash('123456', salt);
                await users[0].save();
                console.log('User updated to admin with password "123456"');
            } else {
                console.log('Creating new admin user...');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('123456', salt);
                await User.create({
                    name: 'Admin User',
                    email,
                    password: hashedPassword,
                    role: 'admin',
                    phone: '0000000000'
                });
                console.log('New admin created.');
            }
        } else {
            console.log('Admin user exists. resetting password to ensure 123456 works...');
            const salt = await bcrypt.genSalt(10);
            adminUser.password = await bcrypt.hash('123456', salt);
            await adminUser.save();
            console.log('Admin password reset to 123456');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

debugLogin();
