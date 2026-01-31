
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const User = require('./backend/models/User');
const Restaurant = require('./backend/models/Restaurant');
const Order = require('./backend/models/Order');
const Rider = require('./backend/models/Rider');

async function checkData() {
    try {
        mongoose.set('bufferCommands', false);
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('MONGO_URI is missing!');
            process.exit(1);
        }
        
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('Connected successfully!');

        const counts = {
            users: await User.countDocuments({ role: 'customer' }),
            restaurants: await Restaurant.countDocuments({}),
            orders: await Order.countDocuments({}),
            riders: await Rider.countDocuments({}),
            admins: await User.countDocuments({ role: 'admin' }),
            superAdmins: await User.countDocuments({ role: 'super-admin' })
        };

        console.log('Data Counts:', counts);

        // Check recent orders
        const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).lean();
        console.log('Recent 5 Orders:', recentOrders.map(o => ({ id: o._id, status: o.status, total: o.totalPrice })));

        // Check recent restaurants
        const recentRestaurants = await Restaurant.find().sort({ createdAt: -1 }).limit(5).lean();
        console.log('Recent 5 Restaurants:', recentRestaurants.map(r => ({ id: r._id, name: r.name, status: r.verificationStatus })));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
