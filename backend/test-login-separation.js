const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const testLoginSeparation = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('Connected to MongoDB');

        const email = 'test@example.com';
        const password = 'password123';

        // 1. Clean up existing test users
        await User.deleteMany({ email });
        console.log('Cleaned up existing test users');

        // 2. Create Customer User
        const customer = await User.create({
            name: 'Test Customer',
            email,
            password,
            role: 'customer',
            phone: '1111111111'
        });
        console.log('Created Customer:', customer._id);

        // 3. Create Restaurant User (same email)
        const restaurant = await User.create({
            name: 'Test Restaurant',
            email,
            password,
            role: 'restaurant',
            phone: '2222222222'
        });
        console.log('Created Restaurant:', restaurant._id);

        // 4. Test Login as Customer
        const customerLogin = await User.findOne({
            $or: [{ email }, { phone: email }],
            role: 'customer'
        });
        
        if (customerLogin && customerLogin._id.toString() === customer._id.toString()) {
            console.log('✅ Customer login verified correctly');
        } else {
            console.log('❌ Customer login failed or returned wrong user');
        }

        // 5. Test Login as Restaurant
        const restaurantLogin = await User.findOne({
            $or: [{ email }, { phone: email }],
            role: 'restaurant'
        });

        if (restaurantLogin && restaurantLogin._id.toString() === restaurant._id.toString()) {
            console.log('✅ Restaurant login verified correctly');
        } else {
            console.log('❌ Restaurant login failed or returned wrong user');
        }

        // 6. Test Login with wrong role (Rider) - Should fail
        const riderLogin = await User.findOne({
            $or: [{ email }, { phone: email }],
            role: 'rider'
        });

        if (!riderLogin) {
            console.log('✅ Rider login correctly failed (no user exists for this role)');
        } else {
            console.log('❌ Rider login should have failed but returned a user');
        }

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

testLoginSeparation();