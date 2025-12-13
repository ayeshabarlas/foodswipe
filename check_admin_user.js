const mongoose = require('mongoose');
const User = require('./backend/models/User'); // Adjust path if needed
const dotenv = require('dotenv');

dotenv.config({ path: './backend/.env' });

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'ayeshabarlas16@gmail.com';
        const user = await User.findOne({ email });

        if (user) {
            console.log('User found:');
            console.log('ID:', user._id);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Is Active:', user.isActive);
        } else {
            console.log('User not found with email:', email);

            // List all admins to be helpful
            const admins = await User.find({ role: 'admin' });
            console.log('\nExisting Admins:', admins.map(a => a.email));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

checkUser();
