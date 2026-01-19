const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const dotenv = require('dotenv');

dotenv.config();

async function listAdmins() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const admins = await Admin.find({});
        console.log('Current Admins:');
        admins.forEach(admin => {
            console.log(`- Name: ${admin.name}, Email: ${admin.email}, Role: ${admin.role}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listAdmins();
