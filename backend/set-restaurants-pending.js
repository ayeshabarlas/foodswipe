const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');
require('dotenv').config();

const updateRestaurantStatus = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB\n');

        // Update all restaurants with 'not_started' to 'pending' so they show in admin
        const result = await Restaurant.updateMany(
            { verificationStatus: 'not_started' },
            { $set: { verificationStatus: 'pending' } }
        );

        console.log(`✅ Updated ${result.modifiedCount} restaurants to 'pending' status`);
        console.log('\n📋 Now they will appear in admin verifications page!');
        console.log('⚠️  Note: They have no documents, but you can still approve them for testing\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

updateRestaurantStatus();
