const mongoose = require('mongoose');
const dotenv = require('dotenv');
const restaurants = require('./data/restaurants');
const dishes = require('./data/dishes');
const Restaurant = require('./models/Restaurant');
const Dish = require('./models/Dish');
const connectDB = require('./config/db');

dotenv.config();

const importDataOnly = async () => {
    try {
        await connectDB();

        // Only delete dishes and restaurants, keep users and orders
        await Dish.deleteMany();
        await Restaurant.deleteMany();

        // Get the first user from database to use as restaurant owner
        const User = require('./models/User');
        const firstUser = await User.findOne();

        if (!firstUser) {
            console.log('No users found. Please sign up first or run the full seeder.');
            process.exit(1);
        }

        const sampleRestaurants = restaurants.map((restaurant) => {
            return { ...restaurant, owner: firstUser._id };
        });

        const createdRestaurants = await Restaurant.insertMany(sampleRestaurants);

        const sampleDishes = dishes.map((dish, index) => {
            const restaurantIndex = index % createdRestaurants.length;
            return { ...dish, restaurant: createdRestaurants[restaurantIndex]._id };
        });

        await Dish.insertMany(sampleDishes);

        console.log('✅ Data Imported! (Users and Orders preserved)');
        process.exit();
    } catch (error) {
        console.error(`❌ Error: ${error}`);
        process.exit(1);
    }
};

importDataOnly();
