const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { connectDB } = require('./backend/config/db');
const adminController = require('./backend/controllers/adminController');

async function testStats() {
    try {
        console.log('Connecting to DB...');
        await connectDB();
        console.log('✅ DB Connected');
        console.log('Current DB:', mongoose.connection.name);

        const req = {};
        const res = {
            json: (data) => {
                console.log('📊 Stats Response:', JSON.stringify(data, null, 2));
            },
            status: (code) => {
                console.log('HTTP Status:', code);
                return res;
            }
        };

        console.log('Calling getQuickStats...');
        await adminController.getQuickStats(req, res);

    } catch (err) {
        console.error('❌ ERROR:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testStats();
