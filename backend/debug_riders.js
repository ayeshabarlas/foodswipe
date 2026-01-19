const mongoose = require('mongoose');
const User = require('./models/User');
const Rider = require('./models/Rider');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

async function debugRiders() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const emails = ['ayeshabarlas16@gmail.com', 'ayeshabarlas636@gmail.com'];
        
        for (const email of emails) {
            console.log(`\n--- Checking ${email} ---`);
            const user = await User.findOne({ email });
            if (user) {
                console.log(`User ID: ${user._id}`);
                console.log(`Name: ${user.name}`);
                console.log(`Role: ${user.role}`);
                
                const rider = await Rider.findOne({ user: user._id });
                if (rider) {
                    console.log(`Rider ID: ${rider._id}`);
                    console.log(`Rider Status: ${rider.verificationStatus}`);
                } else {
                    console.log('No Rider document found for this user');
                }
            } else {
                console.log('User not found');
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugRiders();