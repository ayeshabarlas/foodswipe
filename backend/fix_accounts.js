const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const dotenv = require('dotenv');

dotenv.config();

const fixAccounts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to DB');

        // 1. Delete 'cdd' restaurant (Broken, no docs)
        const cddRef = await Restaurant.findOne({ name: 'cdd' });
        if (cddRef) {
            await Restaurant.deleteOne({ _id: cddRef._id });
            console.log(`Deleted broken restaurant: cdd (${cddRef._id})`);
        } else {
            console.log('Restaurant "cdd" not found.');
        }

        // 2. Fix duplicate 'ayeshabarlas16@gmail.com'
        // We want to KEEP the one that was the owner of 'cdd' (Restaurant Role) so they can create a new one?
        // Actually, if we deleted the restaurant, the user is now a "clean slate".
        // But we have TWO of them. One Rider, One Restaurant.
        // Let's delete the Rider one.
        // And ensure the Restaurant one is actually Role 'restaurant' (or reset to 'customer'?).
        // If they create a restaurant, they become 'restaurant'.

        const duplicates = await User.find({ email: 'ayeshabarlas16@gmail.com' });
        console.log(`Found ${duplicates.length} accounts for ayeshabarlas16@gmail.com`);

        for (const u of duplicates) {
            if (u.role === 'rider') {
                await User.deleteOne({ _id: u._id });
                console.log(`Deleted duplicate Rider account: ${u._id}`);
            } else if (u.role === 'restaurant') {
                console.log(`Kept Restaurant account: ${u._id}`);
                // Verify it doesn't have a restaurant now
                const rest = await Restaurant.findOne({ owner: u._id });
                if (!rest) {
                    console.log('Account is ready for fresh creation.');
                }
            }
        }

        // 3. Fix 'ayeshabarlas92@gmail.com' ambiguities (Optional but helpful)
        // Admin ID: 6932d9dd3990a1b2f036b52d
        // Rename others to avoid login confusion?
        const adminUser = await User.findOne({ _id: '6932d9dd3990a1b2f036b52d' });
        if (adminUser) {
            console.log(`Admin User identified: ${adminUser._id}`);
            await User.updateMany(
                { email: 'ayeshabarlas92@gmail.com', _id: { $ne: adminUser._id } },
                { $set: { email: `dupe_${Math.random().toString(36).substring(7)}@example.com` } }
            );
            console.log('Renamed other ayeshabarlas92 accounts to avoid login conflicts.');
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixAccounts();
