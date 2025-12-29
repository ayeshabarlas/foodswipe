
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
};

const checkData = async () => {
    await connectDB();

    const Restaurant = require('./models/Restaurant');
    const User = require('./models/User');

    console.log('\n--- Checking Restaurants ---');
    const restaurants = await Restaurant.find().populate('owner', 'name email role');

    if (restaurants.length === 0) {
        console.log('No restaurants found.');
    } else {
        restaurants.forEach(r => {
            console.log(`\nID: ${r._id}`);
            console.log(`Name: '${r.name}'`); // Quoted to see if empty string or undefined
            console.log(`Owner: ${r.owner ? r.owner.name + ' (' + r.owner.email + ') - Role: ' + r.owner.role : 'ORPHANED'}`);
            console.log(`Status: ${r.verificationStatus}`);
            console.log(`Created: ${r.createdAt}`);
        });
    }

    console.log('\n--- Checking Recent Users (Last 5) ---');
    const users = await User.find().sort({ createdAt: -1 }).limit(5);
    users.forEach(u => {
        console.log(`User: ${u.name} (${u.email}) - Role: ${u.role} - ID: ${u._id} - Created: ${u.createdAt}`);
    });

    try {
        process.exit();
    } catch (e) { }
};

checkData();
