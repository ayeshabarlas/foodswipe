const mongoose = require('mongoose');
const Dish = require('./models/Dish');
require('dotenv').config();

const fixDuplicateUrls = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB\n');

        const dishes = await Dish.find({});
        let fixedCount = 0;

        for (const dish of dishes) {
            let needsUpdate = false;
            const updates = {};

            // Fix imageUrl if it has duplicate prefix
            if (dish.imageUrl && dish.imageUrl.includes('http://localhost:5000http://localhost:5000')) {
                updates.imageUrl = dish.imageUrl.replace('http://localhost:5000http://localhost:5000', 'http://localhost:5000');
                needsUpdate = true;
                console.log(`🔧 Fixing imageUrl for "${dish.name}"`);
                console.log(`   OLD: ${dish.imageUrl}`);
                console.log(`   NEW: ${updates.imageUrl}`);
            }

            // Fix videoUrl if it has duplicate prefix
            if (dish.videoUrl && dish.videoUrl.includes('http://localhost:5000http://localhost:5000')) {
                updates.videoUrl = dish.videoUrl.replace('http://localhost:5000http://localhost:5000', 'http://localhost:5000');
                needsUpdate = true;
                console.log(`🔧 Fixing videoUrl for "${dish.name}"`);
                console.log(`   OLD: ${dish.videoUrl}`);
                console.log(`   NEW: ${updates.videoUrl}`);
            }

            if (needsUpdate) {
                await Dish.findByIdAndUpdate(dish._id, updates);
                fixedCount++;
                console.log(`✅ Fixed "${dish.name}"\n`);
            }
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Fixed ${fixedCount} dishes with duplicate URLs`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

fixDuplicateUrls();
