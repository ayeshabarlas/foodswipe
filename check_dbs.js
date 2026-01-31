const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function checkDbs() {
    try {
        const mongoUri = process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('✅ CONNECTED');
        
        const testDb = mongoose.connection.useDb('test');
        
        // Check Users
        const UserTest = testDb.collection('users');
        const roles = await UserTest.distinct('role');
        console.log('Users by Role in test:');
        for (const role of roles) {
            const count = await UserTest.countDocuments({ role });
            console.log(`- ${role}: ${count}`);
        }
        const totalUsers = await UserTest.countDocuments();
        console.log('Total users in test:', totalUsers);

        // Check Orders
        const OrderTest = testDb.collection('orders');
        const totalOrders = await OrderTest.countDocuments();
        console.log('Total orders in test:', totalOrders);

        // Check Restaurants
        const RestTest = testDb.collection('restaurants');
        const totalRests = await RestTest.countDocuments();
        console.log('Total restaurants in test:', totalRests);

        // Check Admins
        const AdminTest = testDb.collection('admins');
        const adminCount = await AdminTest.countDocuments();
        console.log('Total admins in test admins collection:', adminCount);
        const admins = await AdminTest.find({}).toArray();
        admins.forEach(a => console.log(`- ${a.email}: ${a.role}`));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

checkDbs();
