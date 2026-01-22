const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function debugData() {
    try {
        const mongoUri = process.env.MONGO_URI.replace('/foodswipe', '/test');
        await mongoose.connect(mongoUri);
        console.log('Connected to TEST DB');

        const Rider = mongoose.connection.db.collection('riders');
        const riderData = await Rider.find({}).toArray();
        console.log('Rider Data:', riderData.map(r => ({
            id: r._id,
            name: r.fullName,
            walletBalance: r.walletBalance,
            earnings_balance: r.earnings_balance,
            cod_balance: r.cod_balance,
            earnings: r.earnings
        })));

        const wallets = await RiderWallet.find({}).toArray();
        console.log('Wallets:', wallets.map(w => ({
            rider: w.rider,
            totalEarnings: w.totalEarnings
        })));

        const riders = await Rider.find({}).toArray();
        console.log('Riders with high balance:', riders.filter(r => r.walletBalance > 1000).map(r => ({
            id: r._id,
            name: r.fullName,
            balance: r.walletBalance
        })));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

debugData();
