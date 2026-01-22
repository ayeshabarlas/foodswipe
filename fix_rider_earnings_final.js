const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function fixRiderEarnings() {
    try {
        const mongoUri = process.env.MONGO_URI.replace('/foodswipe', '/test');
        await mongoose.connect(mongoUri);
        console.log('✅ CONNECTED TO TEST DB');

        const Order = mongoose.connection.db.collection('orders');
        const Rider = mongoose.connection.db.collection('riders');
        const RiderWallet = mongoose.connection.db.collection('riderwallets');

        const riders = await Rider.find({}).toArray();
        console.log(`Found ${riders.length} riders.`);

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        for (let rider of riders) {
            console.log(`\nProcessing Rider: ${rider.fullName} (${rider._id})`);
            
            const deliveredOrders = await Order.find({
                rider: rider._id,
                status: { $in: ['Delivered', 'Completed'] }
            }).toArray();

            console.log(`- Found ${deliveredOrders.length} delivered orders.`);

            let totalEarnings = 0;
            let todayEarnings = 0;
            let weekEarnings = 0;
            let monthEarnings = 0;

            for (let order of deliveredOrders) {
                const earning = order.riderEarning || 0;
                totalEarnings += earning;

                const orderDate = new Date(order.createdAt);
                if (orderDate >= startOfToday) todayEarnings += earning;
                if (orderDate >= startOfWeek) weekEarnings += earning;
                if (orderDate >= startOfMonth) monthEarnings += earning;
            }

            console.log(`- Corrected Earnings: Total=${totalEarnings}, Today=${todayEarnings}, Week=${weekEarnings}, Month=${monthEarnings}`);

            // Update Rider Profile
            await Rider.updateOne(
                { _id: rider._id },
                {
                    $set: {
                        walletBalance: totalEarnings,
                        earnings_balance: totalEarnings,
                        earnings: {
                            today: todayEarnings,
                            thisWeek: weekEarnings,
                            thisMonth: monthEarnings,
                            total: totalEarnings
                        },
                        'stats.completedDeliveries': deliveredOrders.length,
                        'stats.totalDeliveries': deliveredOrders.length,
                        currentOrder: null
                    }
                }
            );
            console.log(`- Updated Rider Profile.`);

            // Update RiderWallet
            await RiderWallet.updateOne(
                { rider: rider._id },
                {
                    $set: {
                        totalEarnings: totalEarnings,
                        availableWithdraw: totalEarnings
                    }
                },
                { upsert: true }
            );
            console.log(`- Updated RiderWallet.`);
        }

        console.log('\n✅ All riders earnings fixed!');
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

fixRiderEarnings();
