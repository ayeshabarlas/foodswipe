const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Admin = require('./models/Admin');
const Rider = require('./models/Rider');
const Restaurant = require('./models/Restaurant');
const Order = require('./models/Order');
const Review = require('./models/Review');
const RiderWallet = require('./models/RiderWallet');
const RestaurantWallet = require('./models/RestaurantWallet');
const CODLedger = require('./models/CODLedger');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const Otp = require('./models/Otp');
const Payout = require('./models/Payout');
const Promotion = require('./models/Promotion');
const Settings = require('./models/Settings');
const Ticket = require('./models/Ticket');
const Transaction = require('./models/Transaction');
const Video = require('./models/Video');
const Voucher = require('./models/Voucher');
const Deal = require('./models/Deal');
const Dish = require('./models/Dish');

const nuclearReset = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for nuclear reset...');

        const collections = [
            User, Admin, Rider, Restaurant, Order, Review,
            RiderWallet, RestaurantWallet, CODLedger, Message,
            Notification, Otp, Payout, Promotion, Settings,
            Ticket, Transaction, Video, Voucher, Deal, Dish
        ];

        console.log('Wiping all collections...');
        for (const model of collections) {
            const result = await model.deleteMany({});
            console.log(`Wiped ${model.modelName}: ${result.deletedCount} documents deleted.`);
        }

        console.log('\nCreating Fresh Super Admin...');
        
        // 1. Create in User collection
        const superAdminUser = new User({
            name: 'Super Admin',
            email: 'superadmin@foodswipe.com',
            password: 'password123',
            role: 'admin',
            status: 'active',
            phone: '03000000000'
        });
        await superAdminUser.save();
        console.log(`Created Super Admin User: ${superAdminUser._id}`);

        // 2. Create in Admin collection
        const superAdminProfile = new Admin({
            name: 'Super Admin',
            email: 'superadmin@foodswipe.com',
            password: 'password123',
            role: 'super-admin',
            status: 'active'
        });
        await superAdminProfile.save();
        console.log(`Created Super Admin Profile: ${superAdminProfile._id}`);

        console.log('\n--- Nuclear Reset Complete ---');
        console.log('Credentials:');
        console.log('Email: superadmin@foodswipe.com');
        console.log('Password: password123');
        
        process.exit(0);
    } catch (error) {
        console.error('Nuclear reset failed:', error);
        process.exit(1);
    }
};

nuclearReset();
