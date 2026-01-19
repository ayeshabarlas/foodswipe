const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    name: String,
    phone: String,
    phoneNumber: String
});

const RiderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: String,
    phone: String,
    email: String,
    verificationStatus: String,
    status: String,
    cod_balance: { type: Number, default: 0 },
    earnings_balance: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);
const Rider = mongoose.model('Rider', RiderSchema);

async function fixRiderAccounts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const riderData = [
            {
                email: 'ayeshabarlas16@gmail.com',
                name: 'Ayesha Rider 16',
                phone: '03001234567'
            },
            {
                email: 'ayeshabarlas636@gmail.com',
                name: 'Ayesha Rider 636',
                phone: '03007654321' // Giving it a unique phone
            }
        ];

        for (const data of riderData) {
            console.log(`\n--- Processing ${data.email} ---`);
            
            // First, find if any OTHER user has this phone and role 'rider'
            const otherUser = await User.findOne({ 
                phone: data.phone, 
                role: 'rider',
                email: { $ne: data.email } 
            });
            if (otherUser) {
                console.log(`Found another rider with phone ${data.phone}: ${otherUser.email}. Changing its phone to avoid conflict.`);
                otherUser.phone = otherUser.phone + '_old';
                await otherUser.save();
            }

            let user = await User.findOne({ email: { $regex: new RegExp(`^${data.email}$`, 'i') } });
            
            if (!user) {
                console.log('User not found, creating...');
                user = await User.create({
                    email: data.email,
                    name: data.name,
                    role: 'rider',
                    phone: data.phone,
                    phoneNumber: data.phone
                });
            } else {
                console.log('User found, updating role and name...');
                user.role = 'rider';
                user.name = data.name;
                user.phone = data.phone;
                user.phoneNumber = data.phone;
                await user.save();
            }

            console.log(`User ID: ${user._id}`);

            let rider = await Rider.findOne({ user: user._id });
            if (!rider) {
                console.log('Rider profile not found, creating...');
                rider = await Rider.create({
                    user: user._id,
                    fullName: data.name,
                    email: data.email,
                    phone: data.phone,
                    verificationStatus: 'approved',
                    status: 'Available',
                    cod_balance: 0,
                    earnings_balance: 0,
                    walletBalance: 0
                });
                console.log(`Rider profile created: ${rider._id}`);
            } else {
                console.log('Rider profile found, updating...');
                rider.fullName = data.name;
                rider.email = data.email;
                rider.phone = data.phone;
                rider.verificationStatus = 'approved';
                await rider.save();
                console.log(`Rider profile updated: ${rider._id}`);
            }
        }

        await mongoose.disconnect();
        console.log('\nDone!');
    } catch (error) {
        console.error('Error:', error);
    }
}

fixRiderAccounts();
