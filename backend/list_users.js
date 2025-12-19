const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const users = await User.find({}, 'name email role');
        console.log('--- ALL USERS ---');
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) -> Role: ${u.role}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listUsers();
