const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://foodswipe:foodswipe123@cluster0.p8v6n.mongodb.net/foodswipe?retryWrites=true&w=majority";

// Mock Models
const adminSchema = new mongoose.Schema({
    email: String,
    password: { type: String, select: true },
    role: String
});
adminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
const Admin = mongoose.model('Admin', adminSchema);

async function testLogin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const email = 'superadmin@foodswipe.com';
        const password = 'password123';

        const admin = await Admin.findOne({ email });
        if (!admin) {
            console.log('❌ Admin not found');
            process.exit(1);
        }

        console.log('Found admin:', admin.email);
        console.log('Hashed password in DB:', admin.password);

        const isMatch = await admin.matchPassword(password);
        console.log('Password match result:', isMatch);

        if (isMatch) {
            console.log('✅ LOGIN SUCCESSFUL');
        } else {
            console.log('❌ LOGIN FAILED');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

testLogin();
