const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Rider = require('./backend/models/Rider');
const Order = require('./backend/models/Order');
const dotenv = require('dotenv');

dotenv.config({ path: './backend/.env' });

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const userCount = await User.countDocuments();
        const riderCount = await Rider.countDocuments();
        const orderCount = await Order.countDocuments();

        console.log('--- DB SUMMARY ---');
        console.log(`Total Users: ${userCount}`);
        console.log(`Total Riders: ${riderCount}`);
        console.log(`Total Orders: ${orderCount}`);

        if (riderCount > 0) {
            const riders = await Rider.find().populate('user', 'name role');
            console.log('--- RIDERS ---');
            riders.forEach(r => {
                console.log(`Rider: ${r.fullName}, User: ${r.user?.name || 'MISSING'}, Role: ${r.user?.role || 'N/A'}, Status: ${r.verificationStatus}`);
            });
        }

        const riderUsers = await User.countDocuments({ role: 'rider' });
        console.log(`Users with role "rider": ${riderUsers}`);

        const restaurantUsers = await User.countDocuments({ role: 'restaurant' });
        console.log(`Users with role "restaurant": ${restaurantUsers}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
