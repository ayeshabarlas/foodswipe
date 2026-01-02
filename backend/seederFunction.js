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
        const restaurants = await Restaurant.find({}).populate('owner');
        const restaurantIdsToDelete = [];

        const mockNameRegex = new RegExp(mockRestaurantNames.join('|'), 'i');

        for (const r of restaurants) {
            let shouldDelete = false;

            // Pattern 1: Known mock names (Case Insensitive Regex)
            if (r.name && (mockNameRegex.test(r.name) || r.name.toLowerCase().includes('mock'))) {
                shouldDelete = true;
            }

            // Pattern 2: Mock contact numbers
            const mockContacts = [
                '021-111-111-111', '051-8484888', '042-35750735', 
                '042-35756107', '0300-1234567', '051-111-111-111',
                '051-2898044', '042-12345678', '0300-8461111', '021-111-666-111'
            ];
            if (r.contact && mockContacts.includes(r.contact)) shouldDelete = true;

            // Pattern 4: Mock logos or generic URLs
            if (r.logo && (r.logo.match(/mock|wikimedia|unsplash|placeholder|Good_Food_Display|loremflickr|picsum/i))) {
                shouldDelete = true;
            }

            // Pattern 5: Mock address patterns for unverified ones
            if (r.address && r.address.match(/karachi|islamabad|lahore|Do Darya|Dastagir|Blue Area|Pir Sohawa|Lakshmi Chowk|Fort Road|F-7 Markaz|North Nazimabad|Mall Road|Liberty Market|Main Boulevard/i)) {
                // Only delete if it's one of the known mock restaurants or unverified
                if (!r.isVerified || mockNameRegex.test(r.name)) {
                    shouldDelete = true;
                }
            }

            // Pattern 6: If owner is missing or has mock email
            if (!r.owner || (r.owner.email && (r.owner.email.includes('example.com') || r.owner.email.includes('test.com')))) {
                shouldDelete = true;
            }

            if (shouldDelete) {
                restaurantIdsToDelete.push(r._id);
            }
        }

        if (restaurantIdsToDelete.length > 0) {
            await Dish.deleteMany({ restaurant: { $in: restaurantIdsToDelete } });
            await Restaurant.deleteMany({ _id: { $in: restaurantIdsToDelete } });
            console.log(`🧹 Removed ${restaurantIdsToDelete.length} mocked restaurants and their dishes.`);
        }

        // Clean up mock users (except admins)
        const mockUserEmails = ['restaurant@example.com', 'rider@example.com', 'customer@example.com'];
        await User.deleteMany({ email: { $in: mockUserEmails } });

        // 2. SEED ADMINS (Only if not exists)
        const adminsToSeed = users.filter(u => u.role === 'admin');
        
        for (const adminSeed of adminsToSeed) {
            const adminExists = await Admin.findOne({ email: adminSeed.email });
            if (!adminExists) {
                console.log(`🌱 Seeding admin account: ${adminSeed.email}...`);
                // Pass plain password, Admin model's pre-save hook will hash it
                await Admin.create({
                    name: adminSeed.name,
                    email: adminSeed.email,
                    password: adminSeed.password,
                    role: 'admin'
                });
                console.log('✅ Admin account created: ' + adminSeed.email);
            }
        }

        console.log('✨ Seeding process completed (Realtime Mode)');
    } catch (error) {
        console.error(`❌ Seeding Error: ${error.message}`);
    }
};

module.exports = seedData;
