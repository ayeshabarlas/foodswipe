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

        // 1. Orders Today
        const ordersToday = await Order.countDocuments({
            restaurant: restaurant._id,
            createdAt: { $gte: today },
            status: { $ne: 'Cancelled' }
        });

        // 2. Revenue Today
        const revenueResult = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurant._id,
                    createdAt: { $gte: today },
                    status: { $in: ['Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Completed'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalPrice' }
                }
            }
        ]);
        const revenueToday = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

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
