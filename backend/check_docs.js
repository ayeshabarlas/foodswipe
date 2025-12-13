const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');
const dotenv = require('dotenv');

dotenv.config();

const checkDocs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Find the most recently created restaurant that is pending
        const restaurant = await Restaurant.findOne({ verificationStatus: 'pending' }).sort({ createdAt: -1 });

        if (restaurant) {
            console.log('Found Pending Restaurant:', restaurant.name);
            console.log('Documents Object:', JSON.stringify(restaurant.documents, null, 2));
            console.log('ID:', restaurant._id);
        } else {
            console.log('No pending restaurants found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

checkDocs();
