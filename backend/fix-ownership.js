const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');

mongoose.connect('mongodb://localhost:27017/foodswipe', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function fixOwnership() {
    try {
        console.log('=== DIAGNOSTIC START ===');

        // Find all restaurant role users
        const restaurantUsers = await User.find({ role: 'restaurant' });
        console.log(`\nFound ${restaurantUsers.length} users with restaurant role:`);
        restaurantUsers.forEach(user => {
            console.log(`  - ${user.name} (${user.email}) - ID: ${user._id}`);
        });

        // Find all restaurants
        const restaurants = await Restaurant.find();
        console.log(`\nFound ${restaurants.length} restaurants:`);
        for (const restaurant of restaurants) {
            console.log(`  - ${restaurant.name} - Owner ID: ${restaurant.owner}`);
            const owner = await User.findById(restaurant.owner);
            if (owner) {
                console.log(`    Owner: ${owner.name} (${owner.email}) - Role: ${owner.role}`);
            } else {
                console.log(`    Owner: NOT FOUND - ORPHANED RESTAURANT`);
            }
        }

        // Fix orphaned restaurants
        if (restaurants.length > 0 && restaurantUsers.length > 0) {
            for (const restaurant of restaurants) {
                const owner = await User.findById(restaurant.owner);
                if (!owner) {
                    console.log(`\n🔧 Fixing orphaned restaurant: ${restaurant.name}`);
                    // Assign to first restaurant user
                    restaurant.owner = restaurantUsers[0]._id;
                    await restaurant.save();
                    console.log(`✅ Assigned to ${restaurantUsers[0].name}`);
                }
            }
        }

        // Update users who own restaurants to have restaurant role
        for (const restaurant of restaurants) {
            const owner = await User.findById(restaurant.owner);
            if (owner && owner.role !== 'restaurant') {
                console.log(`\n🔧 Fixing role for ${owner.name}: ${owner.role} → restaurant`);
                owner.role = 'restaurant';
                await owner.save();
                console.log(`✅ Role updated`);
            }
        }

        console.log('\n=== FIX COMPLETE ===');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixOwnership();
