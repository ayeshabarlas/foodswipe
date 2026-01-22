const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Order = require('../models/Order');
const Rider = require('../models/Rider');
const RiderWallet = require('../models/RiderWallet');
const CODLedger = require('../models/CODLedger');

const fixInflatedOrders = async () => {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🛠️ FIX INFLATED ORDERS INITIATED');
        
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
            const newEarning = 200;
            
            if (order.riderEarning > 200) {
                console.log(`Fixing order ${order._id}: ${oldEarning} -> ${newEarning}`);
                order.riderEarning = newEarning;
                order.netRiderEarning = newEarning;
                order.grossRiderEarning = newEarning;
                
                // Recalculate admin earning for this order
                const commissionAmount = order.commissionAmount || 0;
                const deliveryFee = order.deliveryFee || 0;
                const actualDeliveryFee = deliveryFee > 200 ? 200 : deliveryFee;
                order.deliveryFee = actualDeliveryFee;
                order.adminEarning = commissionAmount + (actualDeliveryFee - newEarning);
            }

            if (order.deliveryFee > 200) order.deliveryFee = 200;
            await order.save();
            fixedOrdersCount++;
        }

        // 2. Fix RiderWallets and Rider Profiles (Recalculate based on fixed orders)
        const wallets = await RiderWallet.find({});
        console.log(`Found ${wallets.length} wallets to check`);
        let fixedWalletsCount = 0;

        for (let wallet of wallets) {
            const riderId = wallet.rider;
            const riderOrders = await Order.find({
                rider: riderId,
                status: { $in: ['Delivered', 'Completed'] }
            });

            const correctTotalEarnings = riderOrders.reduce((sum, o) => sum + (o.riderEarning || 0), 0);
            
            if (wallet.totalEarnings !== correctTotalEarnings) {
                console.log(`Fixing wallet for rider ${riderId}: ${wallet.totalEarnings} -> ${correctTotalEarnings}`);
                wallet.totalEarnings = correctTotalEarnings;
                wallet.availableWithdraw = correctTotalEarnings; // Resetting to total for simplicity
                await wallet.save();
                fixedWalletsCount++;
            }

            // Fix Rider Profile
            const rider = await Rider.findById(riderId);
            if (rider) {
                if (rider.walletBalance !== correctTotalEarnings || rider.earnings_balance !== correctTotalEarnings) {
                    console.log(`Fixing rider profile ${riderId}: balance ${rider.walletBalance} -> ${correctTotalEarnings}`);
                    rider.walletBalance = correctTotalEarnings;
                    rider.earnings_balance = correctTotalEarnings;
                    if (!rider.earnings) rider.earnings = {};
                    rider.earnings.total = correctTotalEarnings;
                    
                    // Recalculate COD balance from ledger
                    const pendingLedger = await CODLedger.find({ rider: riderId, status: 'pending' });
                    const correctCodBalance = pendingLedger.reduce((sum, tx) => sum + (tx.cod_collected || 0), 0);
                    rider.cod_balance = correctCodBalance;
                    
                    await rider.save();
                }
            }
        }

        console.log('✅ Fix complete');
        console.log(`Fixed Orders: ${fixedOrdersCount}`);
        console.log(`Fixed Wallets: ${fixedWalletsCount}`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Fix error:', err);
        process.exit(1);
    }
};

fixInflatedOrders();