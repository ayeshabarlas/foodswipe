const mongoose = require('mongoose');
require('dotenv').config();

// Define schemas inline
const userSchema = new mongoose.Schema({
    name: String,
    email: String
});

const restaurantSchema = new mongoose.Schema({
    name: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationStatus: String,
    documents: {
        cnicFront: String,
        cnicBack: String,
        license: String,
        menu: String
    },
    kitchenPhotos: [String],
    sampleDishPhotos: [String],
    storefrontPhoto: String,
    menuPhotos: [String]
});

const User = mongoose.model('User', userSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

const checkDocuments = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('✅ Connected to MongoDB\n');

        const restaurants = await Restaurant.find({}).populate('owner', 'name email');

        console.log(`Found ${restaurants.length} restaurants\n`);

        restaurants.forEach((restaurant, idx) => {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Restaurant #${idx + 1}: ${restaurant.name}`);
            console.log(`Owner: ${restaurant.owner?.name || 'Unknown'}`);
            console.log(`Email: ${restaurant.owner?.email || 'Unknown'}`);
            console.log(`Status: ${restaurant.verificationStatus}`);
            console.log(`\nDocuments Object:`, restaurant.documents);
            if (restaurant.documents) {
                console.log(`  CNIC Front:`, restaurant.documents.cnicFront || 'NOT SET');
                console.log(`  CNIC Back:`, restaurant.documents.cnicBack || 'NOT SET');
                console.log(`  License:`, restaurant.documents.license || 'NOT SET');
                console.log(`  Menu:`, restaurant.documents.menu || 'NOT SET');
            }
            console.log(`\nKitchen Photos:`, restaurant.kitchenPhotos?.length || 0);
            console.log(`Sample Dishes:`, restaurant.sampleDishPhotos?.length || 0);
            console.log(`Storefront:`, restaurant.storefrontPhoto ? 'YES' : 'NO');
            console.log(`Menu Photos:`, restaurant.menuPhotos?.length || 0);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkDocuments();
