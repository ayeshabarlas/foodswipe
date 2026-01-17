const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private (Restaurant Owner)
 */
const getDashboardStats = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        lastWeek.setHours(0, 0, 0, 0);

        // 1. Orders Today & Weekly
        const ordersToday = await Order.countDocuments({
            restaurant: restaurant._id,
            createdAt: { $gte: today },
            status: { $in: ['Delivered', 'Completed'] }
        });

        const weeklyOrders = await Order.countDocuments({
            restaurant: restaurant._id,
            createdAt: { $gte: lastWeek },
            status: { $in: ['Delivered', 'Completed'] }
        });

        // 2. Revenue & Earnings Today & Weekly
        const statsResult = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurant._id,
                    createdAt: { $gte: lastWeek },
                    status: { $in: ['Delivered', 'Completed'] }
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [{ $gte: ['$createdAt', today] }, 'today', 'weekly']
                    },
                    totalRevenue: { $sum: '$totalPrice' },
                    totalNetEarnings: { $sum: { $ifNull: ['$restaurantEarning', 0] } },
                    totalCommission: { $sum: { $ifNull: ['$commissionAmount', 0] } }
                }
            }
        ]);
        
        // Process stats
        let revenueToday = 0;
        let netEarningsToday = 0;
        let commissionToday = 0;
        let weeklyRevenue = 0;
        let weeklyNetEarnings = 0;

        statsResult.forEach(stat => {
            if (stat._id === 'today') {
                revenueToday = stat.totalRevenue;
                netEarningsToday = stat.totalNetEarnings;
                commissionToday = stat.totalCommission;
            }
            // Weekly includes today
            weeklyRevenue += stat.totalRevenue;
            weeklyNetEarnings += stat.totalNetEarnings;
        });

        // If netEarningsToday is 0 but revenue is not, it means orders are not completed yet.
        // We can show an estimate based on restaurant's commission rate
        let estimatedNetEarnings = netEarningsToday;
        if (netEarningsToday === 0 && revenueToday > 0) {
            const commissionPercent = restaurant.commissionRate || (restaurant.businessType === 'home-chef' ? 10 : 15);
            estimatedNetEarnings = revenueToday * (1 - commissionPercent / 100);
        }

        // 3. Status-based Order Counts
        const pendingCount = await Order.countDocuments({
            restaurant: restaurant._id,
            status: 'Pending'
        });

        const preparingCount = await Order.countDocuments({
            restaurant: restaurant._id,
            status: { $in: ['Accepted', 'Preparing'] }
        });

        const readyCount = await Order.countDocuments({
            restaurant: restaurant._id,
            status: 'Ready'
        });

        const outForDeliveryCount = await Order.countDocuments({
            restaurant: restaurant._id,
            status: { $in: ['OnTheWay', 'Picked Up', 'Arrived', 'ArrivedAtCustomer'] }
        });

        // 4. Top Selling Items (All time for now, or add date filter)
        // This is a bit more complex, might need optimization later
        const topItems = await Order.aggregate([
            { $match: { restaurant: restaurant._id, status: { $ne: 'Cancelled' } } },
            { $unwind: '$orderItems' },
            {
                $group: {
                    _id: '$orderItems.product',
                    name: { $first: '$orderItems.name' },
                    count: { $sum: '$orderItems.qty' },
                    revenue: { $sum: { $multiply: ['$orderItems.qty', '$orderItems.price'] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            ordersToday,
            revenueToday,
            netEarningsToday: netEarningsToday || estimatedNetEarnings,
            commissionToday,
            weeklyOrders,
            weeklyRevenue,
            weeklyNetEarnings,
            pending: pendingCount,
            preparing: preparingCount,
            ready: readyCount,
            outForDelivery: outForDeliveryCount,
            topItems,
            isOnline: restaurant.isActive // Assuming isActive controls online/offline
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Toggle store online/offline status
 * @route   PUT /api/dashboard/toggle-status
 * @access  Private (Restaurant Owner)
 */
const toggleStoreStatus = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.isActive = !restaurant.isActive;
        await restaurant.save();

        res.json({
            message: `Store is now ${restaurant.isActive ? 'Online' : 'Offline'}`,
            isOnline: restaurant.isActive
        });

    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getDashboardStats,
    toggleStoreStatus
};
