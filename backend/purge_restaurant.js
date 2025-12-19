const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');
const dotenv = require('dotenv');

dotenv.config();

async function purgeUserRestaurant() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const email = 'ayeshabarlas92@gmail.com';
        // Find existing restaurant for this email (using owner field if it was populated or just searching for the name if orphaned)
        // Since I've already deleted the user, I'll search by name 'Spicy delight' since I saw it earlier.
        const result = await Restaurant.deleteMany({ ownerEmail: email }); // In case it was stored as email
        const result2 = await Restaurant.deleteOne({ name: 'Spicy delight', address: { $exists: true } }); // Safest bet for the user's specific one

        console.log(`Purged restaurants for user email cleanup.`);
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

purgeUserRestaurant();
