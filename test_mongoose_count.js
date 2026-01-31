const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./backend/models/User');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        
        const count = await User.countDocuments({ role: 'customer' });
        console.log('Customer count via Mongoose model:', count);

        const allUsers = await User.find({}).select('role');
        console.log('All user roles in DB:', allUsers.map(u => u.role));

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
