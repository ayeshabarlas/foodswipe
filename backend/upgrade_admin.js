const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

async function upgradeAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'ayeshabarlas16@gmail.com';
        const admin = await Admin.findOne({ email });

        if (admin) {
            admin.role = 'super-admin';
            await admin.save();
            console.log(`✅ Admin ${email} upgraded to super-admin`);
        } else {
            console.log(`❌ Admin ${email} not found`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

upgradeAdmin();
