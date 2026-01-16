
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./backend/models/User');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'cfahad18@gmail.com';
        const users = await User.find({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (users.length === 0) {
            console.log(`User ${email} NOT found in MongoDB!`);
        } else {
            console.log(`User ${email} found in MongoDB:`);
            users.forEach(u => {
                console.log(`- ID: ${u._id}, Role: ${u.role}, Status: ${u.status}, CreatedAt: ${u.createdAt}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUser();
