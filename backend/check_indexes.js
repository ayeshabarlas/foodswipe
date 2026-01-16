const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
dotenv.config();

async function checkIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to DB');
        
        const indexes = await User.collection.getIndexes();
        console.log('📊 Current Indexes on User collection:');
        console.log(JSON.stringify(indexes, null, 2));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

checkIndexes();
