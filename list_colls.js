const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function listCollections() {
    try {
        const mongoUri = process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('✅ CONNECTED TO:', mongoose.connection.name);
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in', mongoose.connection.name, ':', collections.map(c => c.name));
        
        for (let coll of collections) {
            const count = await mongoose.connection.db.collection(coll.name).countDocuments();
            console.log(`  - ${coll.name}: ${count} documents`);
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

listCollections();
