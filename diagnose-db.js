const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://ayeshabarlas92_db_user:ewYgT05T3q9pylrn@ac-aunz3rr-shard-00-00.ocvynl3.mongodb.net:27017,ac-aunz3rr-shard-00-01.ocvynl3.mongodb.net:27017,ac-aunz3rr-shard-00-02.ocvynl3.mongodb.net:27017/test?ssl=true&authSource=admin';

const adminSchema = new mongoose.Schema({
    email: String,
    password: { type: String, select: true },
    role: String
}, { collection: 'admins' });

const userSchema = new mongoose.Schema({
    email: String,
    password: { type: String, select: true },
    role: String,
    isAdmin: Boolean
}, { collection: 'users' });

async function diagnose() {
    try {
        console.log('--- DB DIAGNOSIS START ---');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to DB');

        const Admin = mongoose.model('AdminDiagnostic', adminSchema);
        const User = mongoose.model('UserDiagnostic', userSchema);

        const email = 'superadmin@foodswipe.com';
        const password = 'FoodSwipe@2024';

        const adminDoc = await Admin.findOne({ email });
        const userDoc = await User.findOne({ email });

        if (!adminDoc) {
            console.log('❌ Admin record NOT FOUND in admins collection');
        } else {
            console.log('✅ Admin record found in admins collection');
            console.log('   Role:', adminDoc.role);
            const match = await bcrypt.compare(password, adminDoc.password);
            console.log('   Password Match Test:', match ? 'SUCCESS' : 'FAILED');
            console.log('   Hash in DB:', adminDoc.password);
        }

        if (!userDoc) {
            console.log('❌ User record NOT FOUND in users collection');
        } else {
            console.log('✅ User record found in users collection');
            console.log('   Role:', userDoc.role);
            console.log('   isAdmin:', userDoc.isAdmin);
            const match = await bcrypt.compare(password, userDoc.password);
            console.log('   Password Match Test:', match ? 'SUCCESS' : 'FAILED');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Diagnosis Error:', err);
        process.exit(1);
    }
}

diagnose();
