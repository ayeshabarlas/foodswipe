const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const Admin = mongoose.model('Admin', new mongoose.Schema({ email: String, role: String }));
        const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));

        const admins = await Admin.find({});
        console.log('\n--- Admins in Admin Collection ---');
        admins.forEach(a => console.log(`- ${a.email} (${a.role})`));

        const userAdmins = await User.find({ role: { $in: ['admin', 'super-admin'] } });
        console.log('\n--- Admins in User Collection ---');
        userAdmins.forEach(u => console.log(`- ${u.email} (${u.role})`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
