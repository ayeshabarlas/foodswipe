const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const verifyAndReset = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('MongoDB Connected');

        // Target specifically the admin user
        const adminUser = await User.findOne({ email: 'ayeshabarlas92@gmail.com', role: 'admin' });

        if (!adminUser) {
            console.log('Admin user not found!');
        } else {
            console.log('Admin user found.');
            // Force reset
            adminUser.password = '123456';
            await adminUser.save();
            console.log('Password reset to 123456.');

            // Verify immediately
            const freshUser = await User.findOne({ email: 'ayeshabarlas92@gmail.com', role: 'admin' });
            const isMatch = await freshUser.matchPassword('123456');
            console.log('Immediate Password Match Check:', isMatch ? 'SUCCESS' : 'FAILED');
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verifyAndReset();
