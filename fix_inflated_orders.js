const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const Order = require('./backend/models/Order');
const RiderWallet = require('./backend/models/RiderWallet');
const Rider = require('./backend/models/Rider');

const MONGO_URI = 'mongodb+srv://ayeshabarlas92_db_user:ewYgT05T3q9pylrn@foodswipe-cluster.ocvynl3.mongodb.net/foodswipe?appName=foodswipe-cluster';

async function fixInflatedOrders() {
    try {
        mongoose.set('bufferCommands', false);
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            family: 4
        });
        console.log('Connected to MongoDB');

        const inflatedOrders = await Order.find({ riderEarning: { $gt: 200 } });
        console.log(`Found ${inflatedOrders.length} orders with riderEarning > 200`);

        for (const order of inflatedOrders) {
            const oldEarning = order.riderEarning;
            const newEarning = 200; // Cap it to 200
            
            console.log(`Fixing order ${order._id}: ${oldEarning} -> ${newEarning}`);
            
            order.riderEarning = newEarning;
            order.netRiderEarning = newEarning;
            order.grossRiderEarning = newEarning;
            
            // Recalculate admin earning for this order
            const commissionAmount = order.commissionAmount || 0;
            const deliveryFee = order.deliveryFee || 0;
            order.adminEarning = commissionAmount + (deliveryFee - newEarning);
            
            await order.save();

            // If rider is assigned, we should also fix their wallet if it was already credited
            if (order.rider && order.status === 'Delivered') {
                const diff = oldEarning - newEarning;
                
                const rider = await Rider.findById(order.rider);
                if (rider) {
                    rider.walletBalance = Math.max(0, (rider.walletBalance || 0) - diff);
                    if (rider.earnings) {
                        rider.earnings.total = Math.max(0, (rider.earnings.total || 0) - diff);
                        rider.earnings.today = Math.max(0, (rider.earnings.today || 0) - diff);
                    }
                    await rider.save();
                    console.log(`Updated rider ${rider._id} wallet: deducted ${diff}`);
                }

                const riderWallet = await RiderWallet.findOne({ rider: order.rider });
                if (riderWallet) {
                    riderWallet.totalEarnings = Math.max(0, (riderWallet.totalEarnings || 0) - diff);
                    riderWallet.availableWithdraw = Math.max(0, (riderWallet.availableWithdraw || 0) - diff);
                    await riderWallet.save();
                }
            }
        }

        console.log('Finished fixing inflated orders');
        await mongoose.connection.close();
    } catch (err) {
        console.error('Error fixing orders:', err);
        process.exit(1);
    }
}

fixInflatedOrders();
