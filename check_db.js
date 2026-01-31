const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI not found in .env file');
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        console.log('Database Name:', mongoose.connection.name);
        
        // Count users by role
        const userRoles = await mongoose.connection.db.collection('users').aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray();
        console.log('User Roles:', userRoles);

        // Count restaurants by status
        const restaurantStatus = await mongoose.connection.db.collection('restaurants').aggregate([
            { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
        ]).toArray();
        console.log('Restaurant Status:', restaurantStatus);

        // Count orders
        const totalOrders = await mongoose.connection.db.collection('orders').countDocuments();
        console.log('Total Orders:', totalOrders);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
