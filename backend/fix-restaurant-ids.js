const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB');

    // Find all restaurants and their owners
    const restaurants = await Restaurant.find({}).populate('owner');

    for (const restaurant of restaurants) {
        if (restaurant.owner) {
            // Update the owner user to have restaurantId
            await User.findByIdAndUpdate(restaurant.owner._id, {
                restaurantId: restaurant._id
            });
            console.log(`✅ Updated ${restaurant.owner.name} with restaurantId: ${restaurant._id}`);
        }
    }

    console.log('\nAll restaurant owners updated!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
