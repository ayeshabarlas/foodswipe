const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');

mongoose.connect('mongodb://localhost:27017/foodswipe').then(async () => {
    console.log('Connected to MongoDB\n');

    // Find the duplicate accounts
    const customerAccount = await User.findOne({ email: 'ayeshabarlas92@gmail.com', role: 'customer' });
    const restaurantAccount = await User.findOne({ email: 'ayeshabarlas92@gmail.com', role: 'restaurant' });

    if (!customerAccount || !restaurantAccount) {
        console.log('Duplicate accounts not found');
        process.exit(0);
    }

    console.log(`Customer account ID: ${customerAccount._id}`);
    console.log(`Restaurant account ID: ${restaurantAccount._id}`);

    // Find restaurants owned by customer account
    const customerRestaurants = await Restaurant.find({ owner: customerAccount._id });
    console.log(`\nRestaurants owned by customer account: ${customerRestaurants.map(r => r.name).join(', ')}`);

    // Transfer ownership to restaurant account
    console.log('\nTransferring ownership...');
    for (const restaurant of customerRestaurants) {
        console.log(`  Transferring "${restaurant.name}" ownership`);
        await Restaurant.findByIdAndUpdate(restaurant._id, { owner: restaurantAccount._id });
    }

    // Delete customer account
    console.log(`\nDeleting duplicate customer account...`);
    await User.findByIdAndDelete(customerAccount._id);

    console.log('\n✅ Fixed! The restaurant account now owns all restaurants.');

    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
