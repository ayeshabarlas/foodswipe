const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Define Schemas locally to avoid complex imports
const orderSchema = new mongoose.Schema({
    orderNumber: String,
    status: String,
    riderEarning: Number,
    deliveryFee: Number,
    netRiderEarning: Number,
    grossRiderEarning: Number,
    adminEarning: Number,
    commissionAmount: Number,
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' }
});

const riderSchema = new mongoose.Schema({
    fullName: String,
    walletBalance: Number,
    earnings_balance: Number,
    cod_balance: Number,
    earnings: { total: Number }
});

const walletSchema = new mongoose.Schema({
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
    totalEarnings: Number,
    availableWithdraw: Number
});

const ledgerSchema = new mongoose.Schema({
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
    status: String,
    cod_collected: Number
});

const Order = mongoose.model('Order', orderSchema);
const Rider = mongoose.model('Rider', riderSchema);
const RiderWallet = mongoose.model('RiderWallet', walletSchema);
const CODLedger = mongoose.model('CODLedger', ledgerSchema);

async function runFix() {
    try {
        console.log('🚀 CONNECTING TO MONGO...');
        // Try to get MONGO_URI from .env or default to local
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe';
        await mongoose.connect(mongoUri);
        console.log('✅ CONNECTED');

        console.log('🛠️ FIXING INFLATED ORDERS...');
        
        // 1. Fix Orders (Cap riderEarning and deliveryFee at 200)
        const orders = await Order.find({ 
            $or: [
                { riderEarning: { $gt: 200 } },
                { deliveryFee: { $gt: 200 } }
            ]
        });
        
        console.log(`Found ${orders.length} inflated orders`);
        let fixedOrdersCount = 0;
        for (let order of orders) {
            const oldEarning = order.riderEarning;
            const newEarning = order.riderEarning > 200 ? 200 : order.riderEarning;
            const oldFee = order.deliveryFee;
            const newFee = order.deliveryFee > 200 ? 200 : order.deliveryFee;
            
            order.riderEarning = newEarning;
            order.netRiderEarning = newEarning;
            order.grossRiderEarning = newEarning;
            order.deliveryFee = newFee;
            
            // Recalculate admin earning
            const commissionAmount = order.commissionAmount || 0;
            order.adminEarning = commissionAmount + (newFee - newEarning);
            
            await order.save();
            fixedOrdersCount++;
            console.log(`Fixed Order #${order.orderNumber || order._id}: ${oldEarning}->${newEarning}, ${oldFee}->${newFee}`);
        }

        // 2. Fix Wallets and Profiles
        const riders = await Rider.find({});
        console.log(`Processing ${riders.length} riders for wallet sync...`);

        for (let rider of riders) {
            const riderOrders = await Order.find({
                rider: rider._id,
                status: { $in: ['Delivered', 'Completed'] }
            });

            const correctTotalEarnings = riderOrders.reduce((sum, o) => sum + (o.riderEarning || 0), 0);
            
            // Update Rider Profile
            rider.walletBalance = correctTotalEarnings;
            rider.earnings_balance = correctTotalEarnings;
            if (!rider.earnings) rider.earnings = {};
            rider.earnings.total = correctTotalEarnings;
            
            // Recalculate COD balance from ledger
            const pendingLedger = await CODLedger.find({ rider: rider._id, status: 'pending' });
            const correctCodBalance = pendingLedger.reduce((sum, tx) => sum + (tx.cod_collected || 0), 0);
            rider.cod_balance = correctCodBalance;
            
            await rider.save();

            // Update Wallet if exists
            await RiderWallet.findOneAndUpdate(
                { rider: rider._id },
                { totalEarnings: correctTotalEarnings, availableWithdraw: correctTotalEarnings },
                { upsert: false }
            );
            
            console.log(`Synced Rider ${rider.fullName}: Earnings=${correctTotalEarnings}, COD=${correctCodBalance}`);
        }

        console.log('🎉 FIX COMPLETE');
        console.log(`Summary: ${fixedOrdersCount} orders fixed, ${riders.length} riders synced.`);
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

runFix();
