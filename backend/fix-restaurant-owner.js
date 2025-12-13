const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Restaurant = require('./models/Restaurant');

async function fixRestaurantOwnership() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find user with email ayeshabarlas92
        const user = await User.findOne({ email: { $regex: 'ayeshabarlas92', $options: 'i' } });

        if (!user) {
            console.log('User not found with email containing ayeshabarlas92');
            console.log('Searching all users...');
            const allUsers = await User.find({}).select('email name');
            console.log('All users:', JSON.stringify(allUsers, null, 2));
            process.exit(1);
        }

        console.log('Found user:', {
            id: user._id,
            email: user.email,
            name: user.name
        });

        // Find restaurant named "spicy"
        const restaurant = await Restaurant.findOne({ name: { $regex: 'spicy', $options: 'i' } });

        if (!restaurant) {
            console.log('Restaurant not found with name containing "spicy"');
            console.log('Searching all restaurants...');
            const allRestaurants = await Restaurant.find({}).select('name owner');
            console.log('All restaurants:', JSON.stringify(allRestaurants, null, 2));
            process.exit(1);
        }

        console.log('Found restaurant:', {
            id: restaurant._id,
            name: restaurant.name,
            currentOwner: restaurant.owner
        });

        // Update restaurant owner
        restaurant.owner = user._id;
        await restaurant.save();

        console.log('\n✅ SUCCESS! Restaurant ownership fixed!');
        console.log(`Restaurant "${restaurant.name}" is now owned by user "${user.email}"`);

        // Verify
        const verifyRestaurant = await Restaurant.findOne({ owner: user._id });
        if (verifyRestaurant) {
            console.log('\n✅ Verification passed! User can now access their restaurant.');
        } else {
            console.log('\n❌ Verification failed! Something went wrong.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixRestaurantOwnership();
