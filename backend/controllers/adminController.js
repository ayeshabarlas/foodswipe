const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Order = require('../models/Order');
const Rider = require('../models/Rider');

// @desc    Get all pending restaurants
// @route   GET /api/admin/restaurants/pending
// @access  Private/Admin
const getPendingRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ verificationStatus: 'pending' })
            .populate('owner', 'name email status')
            .sort({ createdAt: -1 });

        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Approve restaurant
// @route   PUT /api/admin/restaurants/:id/approve
// @access  Private/Admin
const approveRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.isVerified = true;
        restaurant.verificationStatus = 'approved';
        restaurant.isActive = true;

        await restaurant.save();

        // Notify admins about status update
        if (req.app.get('io')) {
            req.app.get('io').to('admin').emit('restaurant_updated', restaurant);
        }

        res.json({ message: 'Restaurant approved successfully', restaurant });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reject restaurant
// @route   PUT /api/admin/restaurants/:id/reject
// @access  Private/Admin
const rejectRestaurant = async (req, res) => {
    try {
        const { reason } = req.body;
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.isVerified = false;
        restaurant.verificationStatus = 'rejected';
        restaurant.rejectionReason = reason || 'Did not meet requirements';
        restaurant.isActive = false;

        await restaurant.save();

        // Notify admins about status update
        if (req.app.get('io')) {
            req.app.get('io').to('admin').emit('restaurant_updated', restaurant);
        }

        res.json({ message: 'Restaurant rejected', restaurant });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all orders (admin overview)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'name email')
            .populate('restaurant', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Basic Counts
        const totalUsers = await User.countDocuments({ role: 'customer' });
        const totalRestaurants = await Restaurant.countDocuments({ isVerified: true, isActive: true });
        const pendingRestaurants = await Restaurant.countDocuments({ verificationStatus: 'pending' });
        const totalOrders = await Order.countDocuments({});
        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: todayStart }
        });

        // Calculate Revenue & Commission (Total & Today)
        const totalStatsResult = await Order.aggregate([
            { $match: { status: { $in: ['Delivered', 'Completed'] } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalPrice' },
                    totalCommission: { $sum: '$commissionAmount' },
                    totalRiderEarnings: { $sum: '$riderEarning' },
                    totalRestaurantEarnings: { $sum: '$restaurantEarning' }
                }
            }
        ]);

        const totalRevenue = totalStatsResult[0]?.totalRevenue || 0;
        const totalCommission = totalStatsResult[0]?.totalCommission || 0;
        const totalRiderEarnings = totalStatsResult[0]?.totalRiderEarnings || 0;
        const totalRestaurantEarnings = totalStatsResult[0]?.totalRestaurantEarnings || 0;

        const todayRevenueResult = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['Delivered', 'Completed'] },
                    createdAt: { $gte: todayStart }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const todayRevenue = todayRevenueResult[0]?.total || 0;

        // Revenue Graph Data (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const revenueStatsRaw = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['Delivered', 'Completed'] },
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing days with 0
        const revenueStats = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const found = revenueStatsRaw.find(r => r._id === dateStr);
            revenueStats.push({
                date: dateStr,
                revenue: found ? found.revenue : 0
            });
        }

        // Order Status Distribution
        const orderStatusStats = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const orderStatusDist = {
            delivered: orderStatusStats.find(s => s._id === 'Delivered' || s._id === 'Completed')?.count || 0,
            cancelled: orderStatusStats.find(s => ['Cancelled', 'Rejected'].includes(s._id))?.count || 0,
            inProgress: orderStatusStats.find(s => !['Delivered', 'Completed', 'Cancelled', 'Rejected'].includes(s._id))?.count || 0,
        };

        // Top Performing Restaurants (by Revenue)
        const topRestaurants = await Order.aggregate([
            { $match: { status: { $in: ['Delivered', 'Completed'] } } },
            {
                $group: {
                    _id: "$restaurant",
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "restaurants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "details"
                }
            },
            { $unwind: "$details" },
            {
                $project: {
                    name: "$details.name",
                    rating: "$details.rating",
                    revenue: 1,
                    orders: 1
                }
            }
        ]);

        // Recent Activity (Orders, New Restaurants, New Riders)
        const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('restaurant', 'name');
        const recentRestaurants = await Restaurant.find().sort({ createdAt: -1 }).limit(3).populate('owner', 'name email status');
        const recentRiders = await Rider.find().sort({ createdAt: -1 }).limit(3).populate('user', 'name email status');

        const recentActivity = [
            ...recentOrders.map(o => ({
                id: o._id,
                type: 'order',
                text: `New order completed`,
                subtext: `Order #${o._id.toString().slice(-5)} delivered successfully`,
                time: o.createdAt
            })),
            ...recentRestaurants.map(r => ({
                id: r._id,
                type: 'restaurant_approval',
                text: `New restaurant registered`,
                subtext: `${r.name} has registered`,
                time: r.createdAt
            })),
            ...recentRiders.map(r => ({
                id: r._id,
                type: 'rider_onboard',
                text: `New rider onboarded`,
                subtext: `${r.user?.name || 'Rider'} registered as rider`,
                time: r.createdAt
            }))
        ]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);

        // Rider Stats
        const totalRiders = await Rider.countDocuments({ verificationStatus: 'approved' });
        const pendingRiders = await Rider.countDocuments({ verificationStatus: 'pending' });
        const onlineRiders = await Rider.countDocuments({ isOnline: true, verificationStatus: 'approved' });

        // Calculate average rider rating
        const riderRatings = await Rider.aggregate([
            { $match: { verificationStatus: 'approved' } },
            { $group: { _id: null, avgRating: { $avg: '$stats.rating' } } }
        ]);
        const avgRiderRating = riderRatings[0]?.avgRating || 0;

        res.json({
            totalUsers,
            totalRestaurants,
            pendingRestaurants,
            totalOrders,
            todayOrders,
            totalRevenue,
            todayRevenue,
            totalCommission,
            totalRiderEarnings,
            totalRestaurantEarnings,
            revenueStats,
            orderStatusDist,
            topRestaurants,
            recentActivity,
            totalRiders,
            pendingRiders,
            onlineRiders,
            avgRiderRating
        });
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all restaurants (active & pending)
const getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find()
            .populate('owner', 'name email status')
            .lean();

        const enrichedRestaurants = await Promise.all(restaurants.map(async (restaurant) => {
            const stats = await Order.aggregate([
                { $match: { restaurant: restaurant._id } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        revenue: {
                            $sum: {
                                $cond: [{ $in: ["$status", ["Delivered", "Completed"]] }, "$totalAmount", 0]
                            }
                        }
                    }
                }
            ]);

            const stat = stats[0] || { totalOrders: 0, revenue: 0 };

            return {
                ...restaurant,
                totalOrders: stat.totalOrders,
                revenue: stat.revenue
            };
        }));

        enrichedRestaurants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(enrichedRestaurants);
    } catch (error) {
        console.error('Error in getAllRestaurants:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all riders
const getAllRiders = async (req, res) => {
    try {
        const riders = await Rider.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { name: 1, email: 1, phone: 1, status: 1 } }
                    ],
                    as: 'userDetails'
                }
            },
            {
                $addFields: {
                    user: { $ifNull: [{ $arrayElemAt: ['$userDetails', 0] }, {}] }
                }
            },
            {
                $lookup: {
                    from: 'orders',
                    let: { riderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$rider', '$$riderId'] },
                                        { $in: ['$status', ['Delivered', 'Completed']] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'allOrders'
                }
            },
            {
                $addFields: {
                    totalOrders: { $size: '$allOrders' },
                    totalEarnings: { $ifNull: ['$earnings.total', 0] },
                    cashCollected: { $ifNull: ['$earnings.thisWeek', 0] }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ridersWithStats = riders.map(rider => {
            const todayOrders = rider.allOrders.filter(o => new Date(o.createdAt) >= today).length;
            return {
                ...rider,
                todayOrders,
                allOrders: undefined
            };
        });

        res.json(ridersWithStats);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get restaurant sales and commission
const getRestaurantSales = async (req, res) => {
    try {
        const sales = await Order.aggregate([
            { $match: { status: { $in: ['Delivered', 'Completed'] } } },
            {
                $group: {
                    _id: '$restaurant',
                    totalSales: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'restaurants',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'restaurantInfo'
                }
            },
            { $unwind: '$restaurantInfo' },
            {
                $project: {
                    restaurantName: '$restaurantInfo.name',
                    totalSales: 1,
                    orderCount: 1,
                    commission: { $multiply: ['$totalSales', 0.10] },
                    netPayable: { $multiply: ['$totalSales', 0.90] }
                }
            }
        ]);

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get daily stats for reports
const getDailyStats = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyOrders = await Order.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(dailyOrders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update system settings
const updateSystemSettings = async (req, res) => {
    try {
        res.json({ message: 'Settings updated successfully', settings: req.body });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all users (customers) with stats
const getUsers = async (req, res) => {
    try {
        const role = req.query.role || 'customer';

        const users = await User.aggregate([
            { $match: { role: role } },
            {
                $lookup: {
                    from: 'orders',
                    let: { userId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$user', '$$userId'] } } }
                    ],
                    as: 'orders'
                }
            },
            {
                $addFields: {
                    totalOrders: { $size: '$orders' },
                    totalSpent: { $sum: '$orders.totalAmount' },
                    lastOrderDate: { $max: '$orders.createdAt' },
                    cancellations: {
                        $size: {
                            $filter: {
                                input: '$orders',
                                as: 'order',
                                cond: { $in: ['$$order.status', ['Cancelled', 'Rejected']] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    phone: 1,
                    role: 1,
                    createdAt: 1,
                    totalOrders: 1,
                    totalSpent: 1,
                    lastOrderDate: 1,
                    cancellations: 1,
                    status: 1
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Suspend a user
const suspendUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.status = 'suspended';
        await user.save();
        res.json({ message: 'User suspended successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Unsuspend a user
const unsuspendUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.status = 'active';
        await user.save();
        res.json({ message: 'User unsuspended successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a user
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'restaurant') {
            await Restaurant.findOneAndDelete({ owner: user._id });
        }
        if (user.role === 'rider') {
            await Rider.findOneAndDelete({ user: user._id });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a restaurant
const deleteRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Delete all dishes associated with this restaurant
        await Dish.deleteMany({ restaurant: restaurant._id });
        
        // Delete the restaurant
        await Restaurant.findByIdAndDelete(req.params.id);

        // Notify admins
        if (req.app.get('io')) {
            req.app.get('io').to('admin').emit('restaurant_updated');
        }

        res.json({ message: 'Restaurant and its dishes deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a rider
const deleteRider = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);
        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        await Rider.findByIdAndDelete(req.params.id);

        // Notify admins
        if (req.app.get('io')) {
            req.app.get('io').to('admin').emit('rider_updated');
        }

        res.json({ message: 'Rider deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Cleanup mock data manually
// @route   POST /api/admin/cleanup-mock
// @access  Private/Admin
const cleanupMockData = async (req, res) => {
    try {
        const seedData = require('../seederFunction');
        await seedData();
        
        // Notify admins to refresh
        if (req.app.get('io')) {
            req.app.get('io').to('admin').emit('restaurant_updated');
            req.app.get('io').to('admin').emit('stats_updated');
        }
        
        res.json({ message: 'Mock data cleanup triggered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Cleanup failed', error: error.message });
    }
};

module.exports = {
    getPendingRestaurants,
    approveRestaurant,
    rejectRestaurant,
    getAllOrders,
    getDashboardStats,
    getAllRestaurants,
    getAllRiders,
    getRestaurantSales,
    getDailyStats,
    updateSystemSettings,
    getUsers,
    suspendUser,
    unsuspendUser,
    deleteUser,
    deleteRestaurant,
    deleteRider,
    cleanupMockData
};
