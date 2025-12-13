const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const resetPhone = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');

        // Reset ALL users to unverified (for testing)
        // OR you can specify an email: { email: 'your@email.com' }
        const result = await User.updateMany(
            {},
            {
                $set: {
                    phoneVerified: false,
                    phoneNumber: null
                }
            }
        );

        console.log(`Reset phone verification for ${result.modifiedCount} users.`);
        console.log('You can now test phone verification again!');
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetPhone();
