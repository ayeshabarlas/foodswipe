const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const User = require('./backend/models/User');

const findUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'cfahad18@gmail.com';
        const users = await User.find({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (users.length === 0) {
            console.log(`User ${email} NOT found in ANY role in MongoDB.`);
            
            // List some users to see what we have
            const someUsers = await User.find().limit(5);
            console.log('\nSample users in DB:');
            someUsers.forEach(u => console.log(`- ${u.email} (${u.role})`));
        } else {
            console.log(`User ${email} found:`);
            users.forEach(u => {
                console.log(`- ID: ${u._id}, Role: ${u.role}, Status: ${u.status}, FirebaseUID: ${u.firebaseUid}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

findUser();
