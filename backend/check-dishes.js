const mongoose = require('mongoose');
const Dish = require('./models/Dish');
require('dotenv').config();

const checkDishes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB\n');

        const dishes = await Dish.find({}).populate('restaurant', 'name');
        console.log(`Found ${dishes.length} dishes\n`);

        dishes.forEach((dish, idx) => {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Dish #${idx + 1}: ${dish.name}`);
            console.log(`Restaurant: ${dish.restaurant?.name || 'Unknown'}`);
            console.log(`Image URL: ${dish.imageUrl || 'NOT SET'}`);
            console.log(`Video URL: ${dish.videoUrl || 'NOT SET'}`);
            console.log(`Price: Rs ${dish.price}`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkDishes();
