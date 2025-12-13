const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const dotenv = require('dotenv');

dotenv.config();

const debugOwners = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to DB');

        const users = await User.find({}, 'name email _id role');
        console.log('\n--- Users ---');
        users.forEach(u => console.log(`${u.email} (${u.role}) - ID: ${u._id}`));

        const restaurants = await Restaurant.find({}, 'name owner verificationStatus documents');
        console.log('\n--- Restaurants ---');
        restaurants.forEach(r => {
            console.log(`Name: ${r.name}`);
            console.log(`Owner ID: ${r.owner}`);
            console.log(`Status: ${r.verificationStatus}`);
            console.log(`Docs: ${Object.keys(r.documents || {}).join(', ')}`);
            console.log('---');
        });

        // Check for specific restaurant 'cdd'
        const cdd = restaurants.find(r => r.name === 'cdd');
        if (cdd) {
            console.log(`\n'cdd' Owner Match Check:`);
            const owner = users.find(u => u._id.toString() === cdd.owner.toString());
            console.log(owner ? `Owner Found: ${owner.email}` : 'Owner NOT found in Users list');
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugOwners();
