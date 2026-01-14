const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function check() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        const db = mongoose.connection.db;
        
        console.log('\n--- ALL USERS IN DB ---');
        const users = await db.collection('users').find({}).toArray();
        users.forEach(u => {
            console.log(`- ID: ${u._id}, Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
        });

        console.log('\n--- ALL ADMINS IN DB ---');
        const admins = await db.collection('admins').find({}).toArray();
        if (admins.length === 0) {
            console.log('No documents in "admins" collection!');
        } else {
            admins.forEach(a => {
                console.log(`- ID: ${a._id}, Email: ${a.email}, Role: ${a.role}, Name: ${a.name}`);
            });
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

check();
