
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
mongoose.set('debug', true);
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const User = require('./backend/models/User');

async function testFetch() {
    try {
        mongoose.set('bufferCommands', false);
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('Connected!');

        console.log('Fetching one user...');
        const user = await User.findOne({}).maxTimeMS(2000);
        console.log('User found:', user ? user.email : 'No user found');

        process.exit(0);
    } catch (error) {
        console.error('Fetch Error:', error);
        process.exit(1);
    }
}

testFetch();
