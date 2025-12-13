const mongoose = require('mongoose');
const Dish = require('./models/Dish');
const Restaurant = require('./models/Restaurant');
require('dotenv').config();

const checkAllData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB\n');

        // Check dishes
        const dishes = await Dish.find({}).populate('restaurant', 'name');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 DISHES (${dishes.length} total)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        dishes.forEach((dish, idx) => {
            console.log(`\n${idx + 1}. ${dish.name}`);
            console.log(`   Restaurant: ${dish.restaurant?.name || 'Unknown'}`);
            console.log(`   Image URL: ${dish.imageUrl || '❌ NOT SET'}`);
            console.log(`   Video URL: ${dish.videoUrl || '❌ NOT SET'}`);
            console.log(`   Price: Rs ${dish.price}`);
        });

        // Check restaurants
        const restaurants = await Restaurant.find({});
        console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🏪 RESTAURANTS (${restaurants.length} total)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        restaurants.forEach((rest, idx) => {
            console.log(`\n${idx + 1}. ${rest.name}`);
            console.log(`   Logo: ${rest.logo || '❌ NOT SET'}`);
            console.log(`   Status: ${rest.verificationStatus}`);
            console.log(`   Owner: ${rest.owner}`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkAllData();
