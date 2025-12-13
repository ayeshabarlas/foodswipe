const mongoose = require('mongoose');
const Order = require('./models/Order');
const dotenv = require('dotenv');

dotenv.config();

const clearOrders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');

        const result = await Order.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} orders from the database`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing orders:', error.message);
        process.exit(1);
    }
};

clearOrders();
