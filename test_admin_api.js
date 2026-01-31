
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const User = require('./backend/models/User');
const Order = require('./backend/models/Order');
const Restaurant = require('./backend/models/Restaurant');
const Rider = require('./backend/models/Rider');
const RestaurantWallet = require('./backend/models/RestaurantWallet');
const RiderWallet = require('./backend/models/RiderWallet');

async function testStats() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        console.log('--- Testing Quick Stats Logic ---');
        const [totalUsers, totalRestaurants, totalOrders, todayOrders, totalRiders] = await Promise.all([
            User.countDocuments({ role: 'customer' }),
            Restaurant.countDocuments({}),
            Order.countDocuments({}),
            Order.countDocuments({ createdAt: { $gte: todayStart } }),
            Rider.countDocuments({})
        ]);
        console.log('Quick Stats:', { totalUsers, totalRestaurants, totalOrders, todayOrders, totalRiders });

        console.log('\n--- Testing Finance Stats Logic ---');
        const finance = await Order.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'Rejected'] } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalPrice' },
                    totalCommission: { $sum: '$commissionAmount' },
                    totalRiderEarnings: { $sum: '$riderEarning' },
                    totalRestaurantEarnings: { $sum: '$restaurantEarning' },
                    totalServiceFees: { $sum: '$serviceFee' },
                    totalTax: { $sum: '$tax' },
                    totalDeliveryFees: { $sum: '$deliveryFee' }
                }
            }
        ]);
        console.log('Finance Stats Result:', finance[0] || 'No data found');

        console.log('\n--- Testing Full Stats Aggregation (Facet) ---');
        const combined = await Order.aggregate([
            {
                $facet: {
                    financeGroup: [
                        { $match: { status: { $nin: ['Cancelled', 'Rejected'] } } },
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: '$totalPrice' },
                                totalCommission: { $sum: '$commissionAmount' }
                            }
                        }
                    ],
                    statusDist: [
                        { $group: { _id: "$status", count: { $sum: 1 } } }
                    ]
                }
            }
        ]);
        console.log('Facet Result:', JSON.stringify(combined[0], null, 2));

        await mongoose.connection.close();
    } catch (err) {
        console.error('❌ Test Failed:', err);
        process.exit(1);
    }
}

testStats();
