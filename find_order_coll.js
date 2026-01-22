const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function findOrderCollection() {
    try {
        const mongoUri = process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('✅ CONNECTED');
        
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        
        for (let dbData of dbs.databases) {
            const dbName = dbData.name;
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            const orderColls = collections.filter(c => c.name.toLowerCase().includes('order'));
            if (orderColls.length > 0) {
                console.log(`DB [${dbName}] has order collections:`, orderColls.map(c => c.name));
                for (let coll of orderColls) {
                    const count = await db.db.collection(coll.name).countDocuments();
                    console.log(`  - ${coll.name}: ${count} documents`);
                }
            }
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

findOrderCollection();
