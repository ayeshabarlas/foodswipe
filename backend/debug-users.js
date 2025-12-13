const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const debugUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('MongoDB Connected');

        const email = 'ayeshabarlas92@gmail.com';
        const users = await User.find({ email });

        console.log(`Found ${users.length} users with email ${email}:`);
        users.forEach(u => {
            console.log(`- ID: ${u._id}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  Password Hash: ${u.password ? u.password.substring(0, 20) + '...' : 'NONE'}`);
        });

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugUsers();
