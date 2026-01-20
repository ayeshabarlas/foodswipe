const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Admin = require('./models/Admin');

const checkSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.\n');

        const email = 'superadmin@foodswipe.com';
        
        console.log(`Checking for: ${email}`);
        
        const adminInColl = await Admin.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (adminInColl) {
            console.log('✅ Found in Admin collection:');
            console.log(JSON.stringify(adminInColl, null, 2));
        } else {
            console.log('❌ NOT found in Admin collection.');
        }

        const userInColl = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (userInColl) {
            console.log('\n✅ Found in User collection:');
            console.log(JSON.stringify(userInColl, null, 2));
        } else {
            console.log('\n❌ NOT found in User collection.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkSuperAdmin();
