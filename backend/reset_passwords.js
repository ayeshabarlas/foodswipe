const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

async function resetPasswords() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const hashedPassword = await bcrypt.hash('Password123', 10);

        // Reset all Ayesha Barlas accounts
        await User.updateMany(
            { email: 'dupe_vgp44r@example.com' },
            { password: hashedPassword }
        );

        // Reset Timmy accounts
        await User.updateMany(
            { email: 'timmytom0245@gmail.com' },
            { password: hashedPassword }
        );

        console.log('Passwords reset to "Password123" for test accounts');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

resetPasswords();
