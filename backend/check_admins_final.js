const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAdmins() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const admins = await Admin.find({});
        console.log('\n--- Admin Collection ---');
        admins.forEach(a => {
            console.log(`Email: ${a.email}, Role: ${a.role}, Status: ${a.status}`);
        });

        const userAdmins = await User.find({ role: /admin/i });
        console.log('\n--- User Collection (with admin role) ---');
        userAdmins.forEach(u => {
            console.log(`Email: ${u.email}, Role: ${u.role}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAdmins();
