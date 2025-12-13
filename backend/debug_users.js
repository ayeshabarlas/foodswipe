const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'ayeshabarlas16@gmail.com';
        const users = await User.find({ email });

        console.log(`Found ${users.length} users for ${email}:`);
        users.forEach(u => {
            console.log(`- ID: ${u._id}, Role: ${u.role}, Name: ${u.name}, Phone: ${u.phone}`);
        });

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUsers();
