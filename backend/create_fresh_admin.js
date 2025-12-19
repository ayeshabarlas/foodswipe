const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const dotenv = require('dotenv');
dotenv.config();

async function createAdmin() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const email = 'admin@foodswipe.com';
    const password = 'password';

    await Admin.deleteMany({ email });
    const admin = await Admin.create({
        name: 'Fresh Admin',
        email,
        password,
        role: 'admin'
    });

    console.log('Admin created successfully');
    console.log('Email:', admin.email);
    console.log('Password: password');

    await mongoose.disconnect();
}

createAdmin();
