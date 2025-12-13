// cleanup_users.js
// Removes all customer accounts from the database to fix authentication issues

const mongoose = require('mongoose');
require('dotenv').config();

const cleanupUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Delete all customer users (you can modify this to target specific emails if needed)
        const result = await mongoose.connection.db.collection('users').deleteMany({
            role: 'customer'
        });

        console.log(`✅ Deleted ${result.deletedCount} customer accounts`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

cleanupUsers();
