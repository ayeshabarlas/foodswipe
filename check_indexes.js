const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://ayeshabarlas:b6fR23lD60E36v1r@cluster0.k5y7d.mongodb.net/foodswipe?retryWrites=true&w=majority';

async function checkIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected.');

        const collections = await mongoose.connection.db.listCollections().toArray();
        for (let col of collections) {
            console.log(`\n--- Indexes for ${col.name} ---`);
            const indexes = await mongoose.connection.db.collection(col.name).indexes();
            console.log(JSON.stringify(indexes, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkIndexes();