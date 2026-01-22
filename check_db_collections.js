const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function checkCollections() {
    try {
        const mongoUri = process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('✅ CONNECTED');
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        
        const OrderCount = await mongoose.connection.db.collection('orders').countDocuments();
        const RiderCount = await mongoose.connection.db.collection('riders').countDocuments();
        console.log('Orders in DB:', OrderCount);
        console.log('Riders in DB:', RiderCount);
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

checkCollections();
