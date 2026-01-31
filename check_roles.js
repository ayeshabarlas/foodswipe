
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function checkRoles() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const roles = await mongoose.connection.db.collection('users').aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray();
        console.log('User roles:', JSON.stringify(roles, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkRoles();
