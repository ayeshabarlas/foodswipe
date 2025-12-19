const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const dotenv = require('dotenv');

dotenv.config();

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'ayeshabarlas92@gmail.com';
        const admin = await Admin.findOne({ email });

        if (admin) {
            console.log('Admin found:');
            console.log(`- ID: ${admin._id}`);
            console.log(`- Email: ${admin.email}`);
            console.log(`- Name: ${admin.name}`);
            console.log(`- Role: ${admin.role}`);

            // Note: Password is hashed, so we can't print it.
            // But we can test Password123
            const isMatch = await admin.matchPassword('Password123');
            console.log(`- Password 'Password123' matches: ${isMatch}`);
        } else {
            console.log(`No admin found with email: ${email}`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAdmin();
