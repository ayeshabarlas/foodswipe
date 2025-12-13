const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');

const updateUsers = async () => {
    try {
        console.log('🔧 Updating all users to remove email verification fields...');

        // Update all users to remove isEmailVerified, emailVerificationToken, and emailVerificationExpires fields
        const result = await User.updateMany(
            {},
            {
                $unset: {
                    isEmailVerified: "",
                    emailVerificationToken: "",
                    emailVerificationExpires: ""
                }
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} users`);
        console.log('✅ All users can now login without email verification!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating users:', error);
        process.exit(1);
    }
};

updateUsers();
