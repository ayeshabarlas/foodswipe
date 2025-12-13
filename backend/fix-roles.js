const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');

mongoose.connect('mongodb://localhost:27017/foodswipe').then(async () => {
    console.log('Connected to MongoDB');

    const users = await User.find({}).select('_id name email role');
    const restaurants = await Restaurant.find({}).select('_id name owner');

    console.log('\n=== CURRENT STATE ===');
    console.log('Total users:', users.length);
    console.log('Total restaurants:', restaurants.length);

    let fixed = 0;
    for (const user of users) {
        const userRestaurant = restaurants.find(r => r.owner.toString() === user._id.toString());
        if (userRestaurant) {
            console.log(`\nUser: ${user.name} (${user.email})`);
            console.log(`  Current role: ${user.role}`);
            console.log(`  Owns restaurant: ${userRestaurant.name}`);

            if (user.role !== 'restaurant' && user.role !== 'admin') {
                console.log(`  🔧 FIXING: Updating role from "${user.role}" to "restaurant"`);
                await User.findByIdAndUpdate(user._id, { role: 'restaurant' });
                fixed++;
            } else {
                console.log('  ✓ Role is correct');
            }
        }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Fixed ${fixed} user role(s)`);

    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
