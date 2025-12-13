const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const dotenv = require('dotenv');

dotenv.config();

const countStats = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const userCount = await User.countDocuments();
        const restaurantCount = await Restaurant.countDocuments();
        const users = await User.find({}, 'email role');
        const restaurants = await Restaurant.find({}, 'name');

        console.log(`\nTotal Users: ${userCount}`);
        console.log(`Total Restaurants: ${restaurantCount}`);

        console.log('\n--- Existing Restaurants ---');
        restaurants.forEach(r => console.log(`- ${r.name}`));

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

countStats();
