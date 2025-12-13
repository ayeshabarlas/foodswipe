const users = require('./data/users');
const restaurants = require('./data/restaurants');
const dishes = require('./data/dishes');
const vouchers = require('./data/vouchers');
const User = require('./models/User');
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

        const usersWithHashedPasswords = await Promise.all(users.map(async (user) => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);
            return { ...user, password: hashedPassword };
        }));

        const createdUsers = await User.insertMany(usersWithHashedPasswords);
        const adminUser = createdUsers[0]._id;
        const restaurantOwner = createdUsers[1]._id;

        const sampleRestaurants = restaurants.map((restaurant, index) => {
            // Assign first restaurant to the specific restaurant owner user
            const owner = index === 0 ? restaurantOwner : adminUser;
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
