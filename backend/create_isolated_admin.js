const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const dotenv = require('dotenv');

dotenv.config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'ayeshabarlas92@gmail.com';

        // Delete existing in the new Admin collection if any
        await Admin.deleteMany({ email });

        await Admin.create({
            name: 'Ayesha Admin',
            email,
            password: 'Password123'
        });

        console.log('Isolated Admin created: ayeshabarlas92@gmail.com / Password123');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

createAdmin();
