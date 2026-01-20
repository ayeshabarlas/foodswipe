const mongoose = require('mongoose');
const admin = require('firebase-admin');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Models
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

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const superHardReset = async () => {
    try {
        console.log('🚀 Starting SUPER HARD RESET...');

        // 1. Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        /* 
        // 2. Wipe Firebase Auth Users
        console.log('🧹 Wiping Firebase Auth users...');
        const listAllUsers = async (nextPageToken) => {
            const result = await admin.auth().listUsers(1000, nextPageToken);
            if (result.users.length > 0) {
                const uids = result.users.map(u => u.uid);
                await admin.auth().deleteUsers(uids);
                console.log(`   - Deleted ${uids.length} Firebase users`);
            }
            if (result.pageToken) {
                await listAllUsers(result.pageToken);
            }
        };
        await listAllUsers();
        console.log('✅ Firebase Auth wiped.');
        */
        console.log('⚠️ Skipping Firebase wipe due to credential issues.');

        // 3. Wipe MongoDB Collections
        const collections = [
            User, Admin, Rider, Restaurant, Order, Review,
            RiderWallet, RestaurantWallet, CODLedger, Message,
            Notification, Otp, Payout, Promotion, Settings,
            Ticket, Transaction, Video, Voucher, Deal, Dish
        ];

        console.log('🧹 Wiping MongoDB collections...');
        for (const model of collections) {
            await model.deleteMany({});
            console.log(`   - Wiped ${model.modelName}`);
        }
        console.log('✅ MongoDB wiped.');

        // 4. Create Super Admin
        console.log('👤 Creating Super Admin...');
        const email = 'superadmin@foodswipe.com';
        const password = 'password123';
        const name = 'Super Admin';
        const phone = '03000000000';

        // Create in User collection
        const superAdminUser = await User.create({
            name,
            email,
            password, // Pre-save hook will hash
            role: 'admin',
            status: 'active',
            phone,
            phoneVerified: true
        });
        console.log(`   - Created User: ${superAdminUser._id}`);

        // Create in Admin collection
        const superAdminProfile = await Admin.create({
            name,
            email,
            password, // Pre-save hook will hash
            role: 'super-admin',
            status: 'active'
        });
        console.log(`   - Created Admin Profile: ${superAdminProfile._id}`);

        console.log('\n--- RESET COMPLETE ---');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('----------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Reset failed:', error);
        process.exit(1);
    }
};

superHardReset();
