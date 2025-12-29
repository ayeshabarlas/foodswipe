const mongoose = require('mongoose');
const Dish = require('./models/Dish');
require('dotenv').config();

const countDishes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB');

        const count = await Dish.countDocuments({ videoUrl: { $exists: true, $ne: '' } });
        console.log(`Found ${count} dishes with videos.`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

countDishes();
