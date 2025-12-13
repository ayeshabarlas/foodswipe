const mongoose = require('mongoose');
const dotenv = require('dotenv');
const users = require('./data/users');
const restaurants = require('./data/restaurants');
const dishes = require('./data/dishes');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Dish = require('./models/Dish');
const Order = require('./models/Order');
const connectDB = require('./config/db');

dotenv.config();

const importData = async () => {
    try {
        await connectDB();

        await Order.deleteMany();
        await Dish.deleteMany();
        await Restaurant.deleteMany();
        await User.deleteMany();

        const createdUsers = await User.insertMany(users);
        const adminUser = createdUsers[0]._id;

        const sampleRestaurants = restaurants.map((restaurant) => {
            return { ...restaurant, owner: adminUser };
        });

        const createdRestaurants = await Restaurant.insertMany(sampleRestaurants);

        const sampleDishes = dishes.map((dish, index) => {
            // Distribute dishes among restaurants
            const restaurantIndex = index % createdRestaurants.length;
            return { ...dish, restaurant: createdRestaurants[restaurantIndex]._id };
        });

        await Dish.insertMany(sampleDishes);

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await connectDB();

        await Order.deleteMany();
        await Dish.deleteMany();
        await Restaurant.deleteMany();
        await User.deleteMany();

        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
