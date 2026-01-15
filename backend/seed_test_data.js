const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');
const Dish = require('./models/Dish');
const User = require('./models/User');
const dotenv = require('dotenv');
dotenv.config();

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to DB');

        // 1. Find or create a user
        let user = await User.findOne({ email: 'test@example.com' });
        if (!user) {
            user = await User.create({
                name: 'Test Owner',
                email: 'test@example.com',
                password: 'password123',
                role: 'restaurant'
            });
            console.log('✅ User created');
        }

        // 2. Create a restaurant
        const restaurant = await Restaurant.create({
            name: 'Test Restaurant',
            owner: user._id,
            address: '123 Test St, Karachi',
            contact: '03001234567',
            description: 'A test restaurant for debugging feed',
            location: {
                type: 'Point',
                coordinates: [67.0011, 24.8607], // Karachi
                description: 'Karachi'
            },
            verificationStatus: 'approved',
            isActive: true
        });
        console.log('✅ Restaurant created');

        // 3. Create a dish
        const dish = await Dish.create({
            name: 'Test Biryani',
            description: 'Spicy and delicious test biryani',
            price: 500,
            imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=800',
            videoUrl: 'https://videos.pexels.com/video-files/5903123/5903123-uhd_2560_1440_25fps.mp4',
            category: 'Desi',
            restaurant: restaurant._id,
            isAvailable: true
        });
        console.log('✅ Dish created');

        await mongoose.disconnect();
        console.log('✅ Seeding complete');
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

seedData();
