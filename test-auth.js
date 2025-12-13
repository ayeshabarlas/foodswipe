const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Restaurant = require('./backend/models/Restaurant');

mongoose.connect('mongodb://localhost:27017/foodswipe', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(async () => {
    console.log('Connected to MongoDB');

    // Find all users and restaurants
    const users = await User.find({}).select('_id name email role');
    const restaurants = await Restaurant.find({}).select('_id name owner');

    console.log('\n=== USERS ===');
    users.forEach(u => {
        console.log(`ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
    });

    console.log('\n=== RESTAURANTS ===');
    restaurants.forEach(r => {
        console.log(`ID: ${r._id}, Name: ${r.name}, Owner: ${r.owner}`);
    });

    console.log('\n=== USER-RESTAURANT MAPPING ===');
    for (const user of users) {
        const userRestaurant = restaurants.find(r => r.owner.toString() === user._id.toString());
        if (userRestaurant) {
            console.log(`${user.name} (${user.role}) owns "${userRestaurant.name}"`);

            // Fix role if needed
            if (user.role !== 'restaurant' && user.role !== 'admin') {
                console.log(`  ⚠️  FIXING ROLE: ${user.role} → restaurant`);
                await User.findByIdAndUpdate(user._id, { role: 'restaurant' });
            }
        }
    }

    process.exit(0);
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
