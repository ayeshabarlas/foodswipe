const users = require('./data/users');
const restaurants = require('./data/restaurants');
const dishes = require('./data/dishes');
const vouchers = require('./data/vouchers');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Restaurant = require('./models/Restaurant');
const Dish = require('./models/Dish');
const Voucher = require('./models/Voucher');

const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        const count = await User.countDocuments();
        if (count > 0) {
            console.log('Data already exists, skipping seed.');
            return;
        }

        console.log('Seeding data...');

        // Split seeds: regular users vs admins
        const userSeeds = users.filter(u => u.role !== 'admin');
        const adminSeeds = users.filter(u => u.role === 'admin');

        const validRoles = ['customer', 'restaurant', 'rider'];
        const usersWithHashedPasswords = await Promise.all(userSeeds.map(async (user) => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);
            const role = validRoles.includes(user.role) ? user.role : 'customer';
            return { ...user, password: hashedPassword, role };
        }));

        const createdUsers = await User.insertMany(usersWithHashedPasswords);

        // Create admin accounts in Admin collection (not User)
        if (adminSeeds.length > 0) {
            const adminsWithHashedPasswords = await Promise.all(adminSeeds.map(async (admin) => {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(admin.password, salt);
                return { name: admin.name, email: admin.email, password: hashedPassword, role: 'admin' };
            }));
            await Admin.insertMany(adminsWithHashedPasswords);
        }

        // Determine restaurant owner from created users
        const restaurantOwnerUser = createdUsers.find(u => u.role === 'restaurant') || createdUsers[0];
        const fallbackOwnerUser = createdUsers.find(u => u.role === 'customer') || createdUsers[0];

        const sampleRestaurants = restaurants.map((restaurant, index) => {
            const owner = index === 0 ? restaurantOwnerUser._id : (fallbackOwnerUser ? fallbackOwnerUser._id : restaurantOwnerUser._id);
            return { ...restaurant, owner };
        });

        const createdRestaurants = await Restaurant.insertMany(sampleRestaurants);

        const sampleDishes = dishes.map((dish, index) => {
            const restaurantIndex = index % createdRestaurants.length;
            return { ...dish, restaurant: createdRestaurants[restaurantIndex]._id };
        });

        await Dish.insertMany(sampleDishes);

        // Seed vouchers
        await Voucher.insertMany(vouchers);

        console.log('Data Imported Successfully!');
    } catch (error) {
        console.error(`Seeding Error: ${error.message}`);
    }
};

module.exports = seedData;
