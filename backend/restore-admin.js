
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const restoreAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const User = require('./models/User');
        const email = 'ayeshabarlas92@gmail.com';

        const user = await User.findOne({ email });
        if (user) {
            console.log(`Found user: ${user.name} (${user.email}) - Current Role: ${user.role}`);
            if (user.role !== 'admin') {
                user.role = 'admin';
                await user.save();
                console.log('SUCCESS: Restored user to ADMIN role.');
            } else {
                console.log('User is already ADMIN.');
            }
        } else {
            console.log(`User ${email} not found.`);
        }

        // Also check if they own a restaurant and set its status to Pending if it's approved?
        // No, let's leave it. The user wants to see "Verification Pending".
        // If the 'Spicy delight' for this user is 'approved', they won't see it in pending list.
        // I should probably reset its status to 'pending' so they can see it in Admin Dashboard?
        // The user said "next you can seee verifivation pending but i cant see it in my admin dashboard".
        // If they are testing the flow, they might want to see the pending request.

        // Let's check for the NEW user's restaurant too.
        // ID: 694fcafa89a949b748a0f951
        const Restaurant = require('./models/Restaurant');
        const newUserId = '694fcafa89a949b748a0f951';
        const newRest = await Restaurant.findOne({ owner: newUserId });
        if (newRest) {
            console.log(`Found NEW Restaurant: ${newRest.name}, Status: ${newRest.verificationStatus}`);
        } else {
            console.log(`Still NO Restaurant found for user ID ${newUserId}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
};

restoreAdmin();
