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

const resetAdminPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'ayeshabarlas92@gmail.com';
        const newPassword = 'admin123';

        let user = await User.findOne({ email });

        if (!user) {
            console.log(`User ${email} not found. Creating new admin user...`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            user = await User.create({
                name: 'Admin User',
                email,
                password: hashedPassword,
                phone: '00000000000',
                role: 'admin'
            });
            console.log('✅ Admin user created successfully');
        } else {
            console.log(`User ${email} found. Updating password...`);
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            if (user.role !== 'admin') {
                console.log('Promoting user to admin role...');
                user.role = 'admin';
            }
            await user.save();
            console.log('✅ Password updated successfully');
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
