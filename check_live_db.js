const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://foodswipe:foodswipe123@cluster0.p8v6n.mongodb.net/foodswipe?retryWrites=true&w=majority";

async function check() {
    try {
        console.log('Connecting to:', MONGO_URI.replace(/:([^@]+)@/, ':****@'));
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nCollections found:', collections.map(c => c.name));

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));

        const userCount = await User.countDocuments();
        const adminCount = await Admin.countDocuments();

        console.log(`\nStats:`);
        console.log(`- Total Users: ${userCount}`);
        console.log(`- Total Admins: ${adminCount}`);

        if (adminCount > 0) {
            const admins = await Admin.find({}, 'email role').lean();
            console.log('\nAdmins in DB:');
            admins.forEach(a => console.log(`- ${a.email} (${a.role})`));
        }

        if (userCount > 0) {
            const superAdminUser = await User.findOne({ email: 'superadmin@foodswipe.com' });
            console.log('\nSuper Admin in User collection:', superAdminUser ? 'YES' : 'NO');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

check();
