const mongoose = require('mongoose');
const Dish = require('./models/Dish');
const Restaurant = require('./models/Restaurant');
const dotenv = require('dotenv');
dotenv.config();

async function checkDishes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to DB');

        const dishesCount = await Dish.countDocuments({});
        console.log(`📊 Total Dishes: ${dishesCount}`);

        const restaurantsCount = await Restaurant.countDocuments({});
        console.log(`📊 Total Restaurants: ${restaurantsCount}`);

        const User = require('./models/User');
        const usersCount = await User.countDocuments({});
        console.log(`📊 Total Users: ${usersCount}`);

        const dishesAll = await Dish.find({});
        console.log(`📊 Total Dishes (no filters): ${dishesAll.length}`);
        if (dishesAll.length > 0) {
            console.log('Sample dish:', dishesAll[0]);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

checkDishes();
