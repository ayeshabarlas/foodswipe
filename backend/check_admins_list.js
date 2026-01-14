const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const dotenv = require('dotenv');

dotenv.config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const admins = await Admin.find({});
        console.log('Total Admins found:', admins.length);
        admins.forEach(admin => {
            console.log(`- Name: ${admin.name}, Email: ${admin.email}, Role: ${admin.role}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkAdmin();
