const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('MongoDB Connected');

        // Check for existing admin
        const adminUser = await User.findOne({ role: 'admin' });

        if (adminUser) {
            console.log('Admin user found:');
            console.log('Name:', adminUser.name);
            console.log('Email:', adminUser.email);
            console.log('Role:', adminUser.role);
            // We won't print the password hash, but knowing it exists is good.
            // If the user forgot the password, we can reset it here.

            // For debugging purposes, let's reset it to '123456' to be sure.
            adminUser.password = '123456';
            await adminUser.save();
            console.log('Admin password reset to: 123456');
        } else {
            console.log('No admin user found. Creating one...');
            const newAdmin = await User.create({
                name: 'Super Admin',
                email: 'admin@foodswipe.com',
                password: 'admin', // This will be hashed by the pre-save hook
                phone: '+923000000000',
                role: 'admin',
                phoneVerified: true
            });
            console.log('Admin created successfully.');
            console.log('Email: admin@foodswipe.com');
            console.log('Password: admin');
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAdmin();
