
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

async function checkCounts() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log('Connected.');

        // Define schemas directly to avoid model registration issues in standalone script
        const User = mongoose.model('User', new mongoose.Schema({ role: String }));
        const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}));
        const Order = mongoose.model('Order', new mongoose.Schema({}));
        const Rider = mongoose.model('Rider', new mongoose.Schema({}));
        const Admin = mongoose.model('Admin', new mongoose.Schema({}));

        console.log('Fetching counts...');
        const [users, restaurants, orders, riders, admins] = await Promise.all([
            User.countDocuments().maxTimeMS(5000),
            Restaurant.countDocuments().maxTimeMS(5000),
            Order.countDocuments().maxTimeMS(5000),
            Rider.countDocuments().maxTimeMS(5000),
            Admin.countDocuments().maxTimeMS(5000)
        ]);

        console.log('users:', users);
        console.log('restaurants:', restaurants);
        console.log('orders:', orders);
        console.log('riders:', riders);
        console.log('admins:', admins);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
        if (mongoose.connection) await mongoose.disconnect();
    }
}

checkCounts();
