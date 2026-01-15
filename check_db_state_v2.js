const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const Dish = require('./backend/models/Dish');
const Restaurant = require('./backend/models/Restaurant');
const User = require('./backend/models/User');

mongoose.set('bufferCommands', false);

async function check() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            family: 4
        });
        console.log('✅ Connected');

        const userCount = await User.countDocuments({});
        console.log(`📊 Total Users: ${userCount}`);
        
        const restCount = await Restaurant.countDocuments({});
        console.log(`📊 Total Restaurants: ${restCount}`);
        if (restCount > 0) {
            const rests = await Restaurant.find({}).limit(5);
            rests.forEach(r => console.log(`- ${r.name} (${r._id}) Owner: ${r.owner} Status: ${r.verificationStatus}`));
        }

        const dishCount = await Dish.countDocuments({});
        console.log(`📊 Total Dishes: ${dishCount}`);
        if (dishCount > 0) {
            const dishes = await Dish.find({}).populate('restaurant').limit(5);
            dishes.forEach(d => console.log(`- ${d.name} (${d._id}) Restaurant: ${d.restaurant?.name || 'NULL'}`));
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

check();
