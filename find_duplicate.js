const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    name: String,
    phone: String
});

const User = mongoose.model('User', UserSchema);

async function findDuplicate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ phone: "03001234567", role: "rider" });
        console.log(JSON.stringify(user, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

findDuplicate();
