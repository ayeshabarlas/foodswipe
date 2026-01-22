const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function checkTestOrders() {
    try {
        const mongoUri = process.env.MONGO_URI;
        // Connect to 'test' database instead of 'foodswipe'
        const testUri = mongoUri.replace('/foodswipe', '/test');
        await mongoose.connect(testUri);
        console.log('✅ CONNECTED TO TEST DB');
        
        const orders = await mongoose.connection.db.collection('orders').find({}).toArray();
        console.log('Orders in TEST:', JSON.stringify(orders, null, 2));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

checkTestOrders();
