const mongoose = require('mongoose');
const Order = require('./models/Order');
const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB');

    // 1. Check restaurants
    const restaurants = await Restaurant.find({}).populate('owner');
    console.log('\n=== RESTAURANTS ===');
    restaurants.forEach(r => {
        console.log(`${r.name} (_id: ${r._id}, owner: ${r.owner?._id})`);
    });

    // 2. Check restaurant users
    const restaurantUsers = await User.find({ role: 'restaurant' });
    console.log('\n=== RESTAURANT USERS ===');
    restaurantUsers.forEach(u => {
        console.log(`${u.name} (email: ${u.email}, _id: ${u._id}, restaurantId: ${u.restaurantId})`);
    });

    // 3. Check recent orders
    const recentOrders = await Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('restaurant', 'name')
        .populate('user', 'name');
    console.log('\n=== RECENT ORDERS ===');
    recentOrders.forEach(o => {
        console.log(`Order ${o._id.toString().slice(-4)}: ${o.status}, Restaurant: ${o.restaurant?.name}, User: ${o.user?.name}, Rider: ${o.rider || 'None'}`);
    });

    // 4. Check Ready/OnTheWay orders
    const readyOrders = await Order.find({ status: { $in: ['Ready', 'OnTheWay'] } })
        .populate('restaurant', 'name')
        .populate('rider', 'fullName');
    console.log(`\n=== READY/ON THE WAY ORDERS (${readyOrders.length}) ===`);
    readyOrders.forEach(o => {
        console.log(`Order ${o._id.toString().slice(-4)}: ${o.status}, Restaurant: ${o.restaurant?.name}, Rider: ${o.rider ? o.rider.fullName : 'Not assigned'}`);
    });

    process.exit(0);
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
