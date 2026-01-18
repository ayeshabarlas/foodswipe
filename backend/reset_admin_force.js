const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['customer', 'restaurant', 'rider', 'admin'], default: 'customer' },
    addresses: [{
        street: String,
        city: String,
        state: String,
        zipCode: String,
        isDefault: { type: Boolean, default: false }
    }],
    defaultAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    fcmToken: { type: String },
    firebaseUid: { type: String },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const AdminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'super-admin'], default: 'admin' }
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

const resetAdminPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'ayeshabarlas16@gmail.com';
        const newPassword = 'meraallah1';

        // 1. Update User collection
        let user = await User.findOne({ email, role: 'admin' });
        const salt = await bcrypt.genSalt(10);
        const hashedAdminPassword = await bcrypt.hash(newPassword, salt);

        if (!user) {
            console.log(`User ${email} not found in User collection. Creating new admin user...`);
            user = await User.create({
                name: 'Ayesha Admin',
                email,
                password: hashedAdminPassword,
                phone: '03001234567',
                role: 'admin'
            });
            console.log('✅ Admin user created in User collection');
        } else {
            console.log(`User ${email} found in User collection. Updating password...`);
            user.password = hashedAdminPassword;
            if (!user.phone) {
                user.phone = '00000000000';
            }
            if (user.role !== 'admin') {
                console.log('Promoting user to admin role...');
                user.role = 'admin';
            }
            await user.save();
            console.log('✅ Password updated in User collection');
        }

        // 2. Update Admin collection
        let admin = await Admin.findOne({ email });
        if (!admin) {
            console.log(`Admin ${email} not found in Admin collection. Creating...`);
            await Admin.create({
                name: 'Ayesha Admin',
                email,
                password: hashedAdminPassword,
                role: 'super-admin'
            });
            console.log('✅ Admin created in Admin collection');
        } else {
            console.log(`Admin ${email} found in Admin collection. Updating password...`);
            admin.password = hashedAdminPassword;
            admin.role = 'super-admin';
            await admin.save();
            console.log('✅ Password updated in Admin collection');
        }

        console.log(`\nYour login credentials:`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${newPassword}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetAdminPassword();
