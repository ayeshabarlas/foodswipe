const mongoose = require('mongoose');
const User = require('./models/User');
const Rider = require('./models/Rider');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

async function findRider() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const name = "asad saleem";
        console.log(`\n--- Searching for user with name matching: "${name}" ---`);
        
        // Find user by name (case-insensitive)
        const user = await User.findOne({ name: { $regex: new RegExp(name, 'i') } });
        
        if (user) {
            console.log(`User ID: ${user._id}`);
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Phone: ${user.phone}`);
            console.log(`Status: ${user.status}`);
            console.log(`Password (Hashed): ${user.password}`);
            
            const rider = await Rider.findOne({ user: user._id });
            if (rider) {
                console.log(`Rider ID: ${rider._id}`);
                console.log(`Verification Status: ${rider.verificationStatus}`);
                console.log(`CNIC Number: ${rider.cnicNumber}`);
                console.log(`Documents: ${JSON.stringify(rider.documents, null, 2)}`);
            } else {
                console.log('No Rider document found for this user');
            }
        } else {
            console.log('User not found');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

findRider();
