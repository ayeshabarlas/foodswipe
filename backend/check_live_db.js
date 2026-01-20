const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Admin = require('./models/Admin');

const checkLiveDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- LIVE DB CHECK ---');
        console.log('URI:', process.env.MONGO_URI.substring(0, 30) + '...');
        
        const userCount = await User.countDocuments();
        const restCount = await Restaurant.countDocuments();
        const adminCount = await Admin.countDocuments();
        
        console.log('Total Users:', userCount);
        console.log('Total Restaurants:', restCount);
        console.log('Total Admins:', adminCount);
        
        if (restCount > 0) {
            const rests = await Restaurant.find().limit(5);
            console.log('First 5 Restaurants:', rests.map(r => r.name));
        }
        
        if (userCount > 0) {
            const users = await User.find().limit(5);
            console.log('First 5 Users:', users.map(u => u.email));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkLiveDb();
