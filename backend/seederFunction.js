const users = require('./data/users');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Restaurant = require('./models/Restaurant');
const Dish = require('./models/Dish');
const Voucher = require('./models/Voucher');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        // 1. CLEANUP MOCK DATA (As requested by user to remove "mocked restaurants" and related data)
        const mockRestaurantNames = [
            'Kolachi', 'Javed Nihari', 'Savour Foods', 'The Monal', 
            'Butt Karahi', 'Haveli Restaurant', 'Ginyaki', 
            'Kababjees', "Salt'n Pepper", 'Bundu Khan'
        ];

        // Find and delete mock restaurants and their related dishes
        const restaurantsToDelete = await Restaurant.find({ 
            $or: [
                { name: { $in: mockRestaurantNames } },
                { 'owner.email': 'customer@example.com' }, // Jane Doe mock email
                { 'owner.name': 'Jane Doe' },
                { owner: { $regex: /^owner\d+$/ } },
                { contact: '021-111-111-111' },
                { contact: '051-8484888' }, // Ginyaki mock contact
                { contact: '042-35750735' }, // Salt'n Pepper mock contact
                { contact: '042-35756107' }, // Bundu Khan mock contact
                { logo: { $regex: /mock/i } }, // Any restaurant with 'mock' in logo path
                { address: { $regex: /karachi|islamabad|lahore/i }, owner: null } // Mock restaurants often have null owner in some versions
            ]
        });
        const restaurantIds = restaurantsToDelete.map(r => r._id);

        if (restaurantIds.length > 0) {
            await Dish.deleteMany({ restaurant: { $in: restaurantIds } });
            await Restaurant.deleteMany({ _id: { $in: restaurantIds } });
            console.log(`🧹 Removed ${restaurantIds.length} mocked restaurants and their dishes.`);
        }

        // Clean up mock users (except admins)
        const mockUserEmails = ['restaurant@example.com', 'rider@example.com', 'customer@example.com'];
        await User.deleteMany({ email: { $in: mockUserEmails } });

        // 2. SEED ADMIN (Only if not exists)
        const adminCount = await Admin.countDocuments();
        
        if (adminCount === 0) {
            console.log('🌱 Seeding initial admin account...');
            const adminSeed = users.find(u => u.role === 'admin');
            
            if (adminSeed) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(adminSeed.password, salt);
                
                await Admin.create({
                    name: adminSeed.name,
                    email: adminSeed.email,
                    password: hashedPassword,
                    role: 'admin'
                });
                console.log('✅ Admin account created: ' + adminSeed.email);
            }
        } else {
            console.log('✅ Admin already exists.');
        }

        console.log('✨ Seeding process completed (Realtime Mode)');
    } catch (error) {
        console.error(`❌ Seeding Error: ${error.message}`);
    }
};

module.exports = seedData;
