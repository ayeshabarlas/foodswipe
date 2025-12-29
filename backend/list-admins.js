const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database');

        const admins = await Admin.find();
        console.log(`\nTotal admins in database: ${admins.length}\n`);

        admins.forEach((admin, index) => {
            console.log(`Admin ${index + 1}:`);
            console.log(`  Email: ${admin.email}`);
            console.log(`  Name: ${admin.name}`);
            console.log(`  Role: ${admin.role}`);
            console.log(`  Has password: ${!!admin.password}`);
            console.log('');
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAdmin();
