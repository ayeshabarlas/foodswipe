const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env BEFORE requiring firebase config
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const User = require('./backend/models/User');
const { admin } = require('./backend/config/firebase');

const runSync = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        console.log('Fetching Firebase users...');
        let syncedCount = 0;
        let alreadyExistsCount = 0;
        let updatedUidCount = 0;

        try {
            const listUsersResult = await admin.auth().listUsers();
            const firebaseUsers = listUsersResult.users;
            console.log(`Found ${firebaseUsers.length} users in Firebase.`);

            for (const fbUser of firebaseUsers) {
                const email = fbUser.email;
                if (!email) continue;

                const existingUser = await User.findOne({ 
                    email: { $regex: new RegExp(`^${email}$`, 'i') }, 
                    role: 'customer' 
                });

                if (!existingUser) {
                    await User.create({
                        name: fbUser.displayName || 'Firebase User',
                        email: email,
                        phone: fbUser.phoneNumber || undefined,
                        password: '',
                        role: 'customer',
                        firebaseUid: fbUser.uid,
                        status: 'active'
                    });
                    console.log(`+ Created new user: ${email}`);
                    syncedCount++;
                } else {
                    if (!existingUser.firebaseUid) {
                        existingUser.firebaseUid = fbUser.uid;
                        await existingUser.save();
                        console.log(`~ Updated FirebaseUID for: ${email}`);
                        updatedUidCount++;
                    }
                    alreadyExistsCount++;
                }
            }
        } catch (firebaseError) {
            console.error('⚠️ Firebase Sync Failed:', firebaseError.message);
            console.log('Proceeding to manual user creation...');
        }

        console.log('\nSync Results:');
        console.log(`- New users created: ${syncedCount}`);
        console.log(`- FirebaseUIDs updated: ${updatedUidCount}`);
        console.log(`- Users already exist: ${alreadyExistsCount}`);
        
        // Final check and manual creation for the specific user
        const targetEmail = 'cfahad18@gmail.com';
        const check = await User.findOne({ email: { $regex: new RegExp(`^${targetEmail}$`, 'i') } });
        if (check) {
            console.log(`\nUser ${targetEmail} already exists in MongoDB.`);
        } else {
            console.log(`\nCreating ${targetEmail} manually in MongoDB...`);
            await User.create({
                name: 'Fahad', // Default name
                email: targetEmail,
                role: 'customer',
                status: 'active',
                password: '',
                firebaseUid: 'manual_sync_' + Date.now() // Placeholder UID
            });
            console.log(`SUCCESS: ${targetEmail} has been created in MongoDB!`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

runSync();
