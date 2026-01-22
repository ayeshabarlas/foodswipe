const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function fixInflatedOrdersInTest() {
    try {
        const mongoUri = process.env.MONGO_URI.replace('/foodswipe', '/test');
        await mongoose.connect(mongoUri);
        console.log('✅ CONNECTED TO TEST DB');

        const Order = mongoose.connection.db.collection('orders');
        const Rider = mongoose.connection.db.collection('riders');
        const RiderWallet = mongoose.connection.db.collection('riderwallets');

        // 1. Fix Orders
        const inflatedOrders = await Order.find({
            $or: [
                { netRiderEarning: { $gt: 200 } },
                { grossRiderEarning: { $gt: 200 } },
                { riderEarning: { $gt: 200 } }
            ]
        }).toArray();

        console.log(`Found ${inflatedOrders.length} inflated orders.`);

        for (let order of inflatedOrders) {
            console.log(`Fixing order ${order._id} (Earning: ${order.netRiderEarning})`);
            
            const newEarning = 200;
            const commissionAmount = order.commissionAmount || 0;
            const deliveryFee = order.deliveryFee || 0;
            const actualDeliveryFee = deliveryFee > 200 ? 200 : deliveryFee;
            
            // Recalculate admin earning
            // adminEarning = commissionAmount + (deliveryFee - riderEarning)
            const newAdminEarning = commissionAmount + (actualDeliveryFee - newEarning);

            await Order.updateOne(
                { _id: order._id },
                {
                    $set: {
                        riderEarning: newEarning,
                        netRiderEarning: newEarning,
                        grossRiderEarning: newEarning,
                        deliveryFee: actualDeliveryFee,
                        adminEarning: newAdminEarning
                    }
                }
            );
        }

        // 2. Fix Rider Wallets and Balances
        const riders = await Rider.find({}).toArray();
        for (let rider of riders) {
            const riderOrders = await Order.find({
                rider: rider._id,
                status: { $in: ['Delivered', 'Completed'] }
            }).toArray();

            const correctTotalEarnings = riderOrders.reduce((sum, o) => sum + (o.riderEarning || 0), 0);
            
            console.log(`Updating Rider ${rider._id}: Correct Earnings = ${correctTotalEarnings}`);

            // Update Rider Wallet
            await RiderWallet.updateOne(
                { rider: rider._id },
                {
                    $set: {
                        totalEarnings: correctTotalEarnings,
                        availableWithdraw: correctTotalEarnings
                    }
                },
                { upsert: true }
            );

            // Update Rider Profile
            await Rider.updateOne(
                { _id: rider._id },
                {
                    $set: {
                        walletBalance: correctTotalEarnings,
                        earnings_balance: correctTotalEarnings,
                        'earnings.total': correctTotalEarnings
                    }
                }
            );
        }

        console.log('✅ Fix completed for TEST DB');
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

fixInflatedOrdersInTest();
