const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Dish = require('./models/Dish');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Deal = require('./models/Deal');

mongoose.connect('mongodb://localhost:27017/foodswipe', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function cleanDatabase() {
    try {
        console.log('🗑️  Starting database cleanup...\n');

        // Delete all data
        await Dish.deleteMany({});
        console.log('✅ Deleted all dishes');

        await Order.deleteMany({});
        console.log('✅ Deleted all orders');

        await Review.deleteMany({});
        console.log('✅ Deleted all reviews');

        await Deal.deleteMany({});
        console.log('✅ Deleted all deals');

        await Restaurant.deleteMany({});
        console.log('✅ Deleted all restaurants');

        await User.deleteMany({});
        console.log('✅ Deleted all users');

        console.log('\n✨ Database cleanup complete! You can now create a fresh account.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanDatabase();
