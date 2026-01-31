const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function checkAdmins() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const Admin = mongoose.model('Admin', new mongoose.Schema({
            email: String,
            role: String
        }), 'admins');

        const admins = await Admin.find({});
        console.log('Admins in DB:', admins);
        
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkAdmins();
