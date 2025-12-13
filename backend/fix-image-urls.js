const mongoose = require('mongoose');
const Dish = require('./models/Dish');
require('dotenv').config();

const fixImageUrls = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB\n');

        // Find all dishes
        const dishes = await Dish.find({});
        console.log(`Found ${dishes.length} dishes\n`);

        let fixedCount = 0;

        for (const dish of dishes) {
            let needsUpdate = false;
            const updates = {};

            // Fix imageUrl if it's just a filename
            if (dish.imageUrl && !dish.imageUrl.startsWith('http') && !dish.imageUrl.startsWith('/uploads')) {
                updates.imageUrl = `/uploads/${dish.imageUrl}`;
                needsUpdate = true;
                console.log(`📝 Fixing imageUrl for "${dish.name}": ${dish.imageUrl} → ${updates.imageUrl}`);
            }

            // Fix videoUrl if it's just a filename
            if (dish.videoUrl && !dish.videoUrl.startsWith('http') && !dish.videoUrl.startsWith('/uploads')) {
                updates.videoUrl = `/uploads/${dish.videoUrl}`;
                needsUpdate = true;
                console.log(`📝 Fixing videoUrl for "${dish.name}": ${dish.videoUrl} → ${updates.videoUrl}`);
            }

            if (needsUpdate) {
                await Dish.findByIdAndUpdate(dish._id, updates);
                fixedCount++;
                console.log(`✅ Updated "${dish.name}"\n`);
            }
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Fixed ${fixedCount} dishes`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

fixImageUrls();
