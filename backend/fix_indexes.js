const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const User = require('./models/User');
        
        // List current indexes
        const indexes = await User.collection.getIndexes();
        console.log('Current indexes:', Object.keys(indexes));

        // Drop all indexes except _id_
        for (const indexName of Object.keys(indexes)) {
            if (indexName !== '_id_') {
                console.log(`Dropping index ${indexName}...`);
                try {
                    await User.collection.dropIndex(indexName);
                    console.log(`Successfully dropped ${indexName}`);
                } catch (e) {
                    console.log(`Error dropping ${indexName}:`, e.message);
                }
            }
        }

        console.log('Creating new indexes based on model...');
        await User.createIndexes();
        console.log('New indexes created.');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error fixing indexes:', error);
    }
}

fixIndexes();
