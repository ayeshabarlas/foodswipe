const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Rider = require('../models/Rider');
const Order = require('../models/Order');
const User = require('../models/User');
const RestaurantWallet = require('../models/RestaurantWallet');
const RiderWallet = require('../models/RiderWallet');
const Video = require('../models/Video');
const Settings = require('../models/Settings');
const Dish = require('../models/Dish');
const CODLedger = require('../models/CODLedger');
const Payout = require('../models/Payout');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const RiderBonus = require('../models/RiderBonus');
const { triggerEvent } = require('../socket');
const AuditLog = require('../models/AuditLog');
const Admin = require('../models/Admin');

console.log('✅ Admin Controller Models Loaded:', {
    User: !!User,
    Restaurant: !!Restaurant,
    Order: !!Order,
    Rider: !!Rider
});

const sendEmail = require('../utils/email');
const { calculateRiderEarning } = require('../utils/paymentUtils');

// Helper to notify admin
const notifyAdmin = async (subject, message) => {
    try {
        // Find super admins
        const superAdmins = await Admin.find({ role: 'super-admin' });
        const adminEmails = [...new Set([...superAdmins.map(admin => admin.email), 'app.foodswiphelp@gmail.com'])];

        if (adminEmails.length > 0) {
            await sendEmail({
                email: adminEmails.join(','),
                subject: `[FoodSwipe Admin Alert] ${subject}`,
                message: message,
                html: `<h3>FoodSwipe Admin Alert</h3><p>${message}</p>`
            });
            console.log(`Admin alert sent to: ${adminEmails.join(',')}`);
        }
    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
};

// @desc    Get all pending restaurants
// @route   GET /api/admin/restaurants/pending
// @access  Private/Admin
const getPendingRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ verificationStatus: 'pending' })
            .populate('owner')
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

        // Audit Log
        try {
            await AuditLog.create({
                event: 'RESTAURANT_APPROVED',
                userId: restaurant.owner?._id || restaurant.owner,
                email: restaurant.name,
                details: { approvedBy: req.admin?._id || req.user?._id || 'system' }
            });
        } catch (auditErr) {
            console.warn('⚠️ Audit log creation failed:', auditErr.message);
        }

        // Notify admins about status update
        try {
            const resData = restaurant.toObject ? restaurant.toObject() : restaurant;
            triggerEvent('admin', 'restaurant_updated', resData);
            triggerEvent('admin', 'stats_updated');
            triggerEvent('admin', 'notification', {
                type: 'info',
                message: `Restaurant ${restaurant.name} approved`
            });
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Restaurant approved successfully', restaurant });
    } catch (error) {
        console.error('❌ Approve Restaurant Error:', error);
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

        // Audit Log
        try {
            await AuditLog.create({
                event: 'RESTAURANT_REJECTED',
                userId: restaurant.owner?._id || restaurant.owner,
                email: restaurant.name,
                details: {
                    reason,
                    rejectedBy: req.admin?._id || req.user?._id || 'system'
                }
            });
        } catch (auditErr) {
            console.warn('⚠️ Audit log creation failed:', auditErr.message);
        }

        // Notify admins about status update
        try {
            const resData = restaurant.toObject ? restaurant.toObject() : restaurant;
            triggerEvent('admin', 'restaurant_updated', resData);
            triggerEvent('admin', 'stats_updated');
            triggerEvent('admin', 'notification', {
                type: 'warning',
                message: `Restaurant ${restaurant.name} rejected: ${reason || 'No reason provided'}`
            });
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Restaurant rejected', restaurant });
    } catch (error) {
        console.error('❌ Reject Restaurant Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Approve rider
// @route   PUT /api/admin/riders/:id/approve
// @access  Private/Admin
const approveRider = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        rider.verificationStatus = 'approved';
        await rider.save();

        // Audit Log
        try {
            await AuditLog.create({
                event: 'RIDER_APPROVED',
                userId: rider.user?._id || rider.user,
                email: rider.fullName,
                details: { approvedBy: req.admin?._id || req.user?._id || 'system' }
            });
        } catch (auditErr) {
            console.warn('⚠️ Audit log creation failed:', auditErr.message);
        }

        // Notify admins about status update
        try {
            const riderData = rider.toObject ? rider.toObject() : rider;
            triggerEvent('admin', 'rider_updated', riderData);
            triggerEvent('admin', 'user_updated');
            triggerEvent('admin', 'stats_updated');
            triggerEvent('admin', 'notification', {
                type: 'info',
                message: `Rider ${rider.fullName} approved`
            });
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Rider approved successfully', rider });
    } catch (error) {
        console.error('❌ Approve Rider Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reject rider
// @route   PUT /api/admin/riders/:id/reject
// @access  Private/Admin
const rejectRider = async (req, res) => {
    try {
        const { reason } = req.body;
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        rider.verificationStatus = 'rejected';
        // Add rejection reason if you have a field for it, or just update status
        await rider.save();

        // Audit Log
        try {
            await AuditLog.create({
                event: 'RIDER_REJECTED',
                userId: rider.user?._id || rider.user,
                email: rider.fullName,
                details: {
                    reason,
                    rejectedBy: req.admin?._id || req.user?._id || 'system'
                }
            });
        } catch (auditErr) {
            console.warn('⚠️ Audit log creation failed:', auditErr.message);
        }

        // Notify admins about status update
        try {
            const riderData = rider.toObject ? rider.toObject() : rider;
            triggerEvent('admin', 'rider_updated', riderData);
            triggerEvent('admin', 'user_updated');
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Rider rejected', rider });
    } catch (error) {
        console.error('❌ Reject Rider Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reset rider to 'new' status (to allow re-registration/document upload)
// @route   PUT /api/admin/riders/:id/reset
// @access  Private/Admin
const resetRider = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        rider.verificationStatus = 'new';
        // Optional: clear documents if you want a complete fresh start
        // rider.documents = { cnicFront: '', cnicBack: '', drivingLicense: '', vehicleRegistration: '', profileSelfie: '' };
        // rider.cnicNumber = '';

        await rider.save();

        // Audit Log
        try {
            await AuditLog.create({
                event: 'RIDER_RESET',
                userId: rider.user?._id || rider.user,
                email: rider.fullName,
                details: { resetBy: req.admin?._id || req.user?._id || 'system' }
            });
        } catch (auditErr) {
            console.warn('⚠️ Audit log creation failed:', auditErr.message);
        }

        // Notify admins about status update
        try {
            const riderData = rider.toObject ? rider.toObject() : rider;
            triggerEvent('admin', 'rider_updated', riderData);
            triggerEvent('admin', 'user_updated');
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Rider reset to new status successfully', rider });
    } catch (error) {
        console.error('❌ Reset Rider Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all orders (admin overview)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone email' }
            })
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get Quick Dashboard Statistics (Counts only, fast)
// @route   GET /api/admin/stats/quick
// @access  Private/Admin
const getQuickStats = async (req, res) => {
    console.log('📊 [getQuickStats] API START');
    const startTime = Date.now();
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        console.log('- Fetching counts...');
        const results = await Promise.allSettled([
            User.countDocuments({ role: 'customer' }).maxTimeMS(5000),
            Restaurant.countDocuments({}).maxTimeMS(5000),
            Order.countDocuments({}).maxTimeMS(5000),
            Order.countDocuments({ createdAt: { $gte: todayStart } }).maxTimeMS(5000),
            Rider.countDocuments({}).maxTimeMS(5000)
        ]);

        const totalUsers = results[0].status === 'fulfilled' ? results[0].value : 0;
        const totalRestaurants = results[1].status === 'fulfilled' ? results[1].value : 0;
        const totalOrders = results[2].status === 'fulfilled' ? results[2].value : 0;
        const todayOrders = results[3].status === 'fulfilled' ? results[3].value : 0;
        const totalRiders = results[4].status === 'fulfilled' ? results[4].value : 0;

        console.log(`✅ [getQuickStats] Success in ${Date.now() - startTime}ms`);
        res.json({
            totalUsers,
            totalRestaurants,
            totalOrders,
            todayOrders,
            totalRiders,
            _timestamp: new Date()
        });
    } catch (error) {
        console.error(`❌ [getQuickStats] Error after ${Date.now() - startTime}ms:`, error);
        res.status(500).json({ message: 'Error fetching quick stats', error: error.message });
    }
};

// @desc    Get Finance Dashboard Statistics (Aggregations, slower)
// @route   GET /api/admin/stats/finance
// @access  Private/Admin
const getFinanceStats = async (req, res) => {
    console.log('💰 [getFinanceStats] API START');
    const startTime = Date.now();
    try {
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
        ]).option({ maxTimeMS: 20000 });

        const f = finance[0] || {};
        const netProfit = (f.totalCommission || 0) +
                        ((f.totalDeliveryFees || 0) - (f.totalRiderEarnings || 0)) +
                        (f.totalServiceFees || 0) +
                        (f.totalTax || 0);

        console.log(`✅ [getFinanceStats] Success in ${Date.now() - startTime}ms`);
        res.json({
            totalRevenue: f.totalRevenue || 0,
            totalCommission: f.totalCommission || 0,
            totalRiderEarnings: f.totalRiderEarnings || 0,
            totalRestaurantEarnings: f.totalRestaurantEarnings || 0,
            totalServiceFees: f.totalServiceFees || 0,
            totalTax: f.totalTax || 0,
            totalDeliveryFees: f.totalDeliveryFees || 0,
            netPlatformProfit: netProfit,
            _timestamp: new Date()
        });
    } catch (error) {
        console.error(`❌ [getFinanceStats] Error after ${Date.now() - startTime}ms:`, error);
        res.status(500).json({ message: 'Error fetching finance stats', error: error.message });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    console.log('📊 [getDashboardStats] API START');
    const startTime = Date.now();

    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        let stats = {
            totalUsers: 0, totalRestaurants: 0, pendingRestaurants: 0, totalOrders: 0, todayOrders: 0,
            totalRevenue: 0, todayRevenue: 0, totalCommission: 0, totalRiderEarnings: 0, totalRestaurantEarnings: 0,
            totalDeliveryFees: 0, totalServiceFees: 0, totalTax: 0, totalPendingPayouts: 0,
            revenueStats: [], orderStatusDist: { delivered: 0, cancelled: 0, inProgress: 0 },
            topRestaurants: [], recentActivity: [], totalRiders: 0, pendingRiders: 0,
            onlineRiders: 0, avgRiderRating: 0, netPlatformProfit: 0
        };

        // Helper to run query with timing
        const timedQuery = async (name, queryPromise) => {
            const start = Date.now();
            try {
                const result = await queryPromise;
                console.log(`⏱️ Query [${name}] took ${Date.now() - start}ms`);
                return result;
            } catch (err) {
                console.error(`❌ Query [${name}] failed after ${Date.now() - start}ms:`, err.message);
                throw err;
            }
        };

        console.log('🚀 Starting optimized parallel queries with facet aggregation...');
        const queryStart = Date.now();

        const results = await Promise.allSettled([
            // Basic Counts (Fast)
            timedQuery('totalUsers', User.countDocuments({ role: 'customer' }).maxTimeMS(5000)),
            timedQuery('totalRestaurants', Restaurant.countDocuments({}).maxTimeMS(5000)),
            timedQuery('pendingRestaurants', Restaurant.countDocuments({ verificationStatus: 'pending' }).maxTimeMS(5000)),
            timedQuery('totalOrders', Order.countDocuments({}).maxTimeMS(5000)),
            timedQuery('todayOrders', Order.countDocuments({ createdAt: { $gte: todayStart } }).maxTimeMS(5000)),
            timedQuery('totalRiders', Rider.countDocuments({}).maxTimeMS(5000)),
            timedQuery('pendingRiders', Rider.countDocuments({ verificationStatus: 'pending' }).maxTimeMS(5000)),
            timedQuery('onlineRiders', Rider.countDocuments({ isOnline: true, verificationStatus: 'approved' }).maxTimeMS(5000)),
            
            // Combined Order Stats Aggregation (Much more efficient than separate calls)
            timedQuery('combinedOrderStats', Order.aggregate([
                {
                    $facet: {
                        financeGroup: [
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
                        ],
                        todayRevenue: [
                            { $match: { status: { $nin: ['Cancelled', 'Rejected'] }, createdAt: { $gte: todayStart } } },
                            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
                        ],
                        statusDist: [
                            { $group: { _id: "$status", count: { $sum: 1 } } }
                        ]
                    }
                }
            ]).option({ maxTimeMS: 15000 })),

            timedQuery('recentOrders', Order.find({})
                .sort({ createdAt: -1 })
                .limit(10)
                .select('_id status createdAt totalPrice')
                .lean()
                .maxTimeMS(5000)
            ),

            timedQuery('resWallet', RestaurantWallet.aggregate([{ $group: { _id: null, total: { $sum: '$pendingPayout' } } }]).option({ maxTimeMS: 5000 })),
            timedQuery('riderWallet', RiderWallet.aggregate([{ $group: { _id: null, total: { $sum: '$availableWithdraw' } } }]).option({ maxTimeMS: 5000 }))
        ]);

        const totalQueryTime = Date.now() - queryStart;
        console.log(`📊 All queries settled in ${totalQueryTime}ms`);

        // Map Results safely
        if (results[0].status === 'fulfilled') stats.totalUsers = results[0].value || 0;
        if (results[1].status === 'fulfilled') stats.totalRestaurants = results[1].value || 0;
        if (results[2].status === 'fulfilled') stats.pendingRestaurants = results[2].value || 0;
        if (results[3].status === 'fulfilled') stats.totalOrders = results[3].value || 0;
        if (results[4].status === 'fulfilled') stats.todayOrders = results[4].value || 0;
        if (results[5].status === 'fulfilled') stats.totalRiders = results[5].value || 0;
        if (results[6].status === 'fulfilled') stats.pendingRiders = results[6].value || 0;
        if (results[7].status === 'fulfilled') stats.onlineRiders = results[7].value || 0;

        // Process Combined Aggregation [8]
        if (results[8].status === 'fulfilled' && results[8].value && results[8].value[0]) {
            const facet = results[8].value[0];
            
            // financeGroup
            if (facet.financeGroup && facet.financeGroup[0]) {
                const gf = facet.financeGroup[0];
                stats.totalRevenue = gf.totalRevenue || 0;
                stats.totalCommission = gf.totalCommission || 0;
                stats.totalRiderEarnings = gf.totalRiderEarnings || 0;
                stats.totalRestaurantEarnings = gf.totalRestaurantEarnings || 0;
                stats.totalServiceFees = gf.totalServiceFees || 0;
                stats.totalTax = gf.totalTax || 0;
                stats.totalDeliveryFees = gf.totalDeliveryFees || 0;

                stats.netPlatformProfit = (gf.totalCommission || 0) +
                    ((gf.totalDeliveryFees || 0) - (gf.totalRiderEarnings || 0)) +
                    (gf.totalServiceFees || 0) +
                    (gf.totalTax || 0);
            }

            // todayRevenue
            if (facet.todayRevenue && facet.todayRevenue[0]) {
                stats.todayRevenue = facet.todayRevenue[0].total || 0;
            }

            // statusDist
            if (facet.statusDist) {
                facet.statusDist.forEach(item => {
                    if (['Delivered', 'Completed'].includes(item._id)) stats.orderStatusDist.delivered += item.count;
                    else if (['Cancelled', 'Rejected'].includes(item._id)) stats.orderStatusDist.cancelled += item.count;
                    else stats.orderStatusDist.inProgress += item.count;
                });
            }
        }

        // Recent Orders [9]
        if (results[9].status === 'fulfilled' && results[9].value) {
            stats.recentActivity = results[9].value.map(o => ({
                id: o._id,
                type: 'order',
                text: `Order #${o._id.toString().slice(-4).toUpperCase()}`,
                subtext: `${o.status} - Rs. ${o.totalPrice}`,
                time: o.createdAt
            }));
        }

        const resPending = (results[10].status === 'fulfilled' && results[10].value && results[10].value[0]) ? results[10].value[0].total : 0;
        const riderPending = (results[11].status === 'fulfilled' && results[11].value && results[11].value[0]) ? results[11].value[0].total : 0;
        stats.totalPendingPayouts = resPending + riderPending;

        console.log(`✅ [getDashboardStats] FINISHED in ${Date.now() - startTime}ms`);
        
        const debugInfo = {
            queries: results.map((r, i) => ({
                id: i,
                status: r.status,
                error: r.status === 'rejected' ? r.reason?.message : null
            })),
            totalTime: Date.now() - startTime,
            dbStatus: mongoose.connection.readyState
        };

        return res.status(200).json({ 
            ...stats, 
            _debug: debugInfo,
            _version: '2.5.0-STABLE'
        });

    } catch (error) {
        console.error('🔥 [getDashboardStats] CRITICAL ERROR:', error);
        return res.status(500).json({ 
            message: 'Server error while fetching stats', 
            error: error.message,
            _debug: { error: error.stack }
        });
    }
};

// @desc    Get all restaurants (active & pending)
const getAllRestaurants = async (req, res) => {
    try {
        console.log('Fetching all restaurants for admin...');

        // 1. Fetch all restaurants efficiently
        const restaurants = await Restaurant.find().populate('owner', 'name email phone').lean();

        // 2. Fetch stats for ALL restaurants in ONE aggregation pass to solve N+1 problem
        const allStats = await Order.aggregate([
            {
                $match: { status: { $in: ['Delivered', 'Completed'] } }
            },
            {
                $group: {
                    _id: '$restaurant',
                    totalOrders: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' },
                    commission: { $sum: '$commissionAmount' }
                }
            }
        ]);

        // Create a lookup map for stats
        const statsMap = allStats.reduce((acc, curr) => {
            acc[curr._id.toString()] = curr;
            return acc;
        }, {});

        // 3. Enrich restaurants from the map
        const enrichedRestaurants = restaurants.map(restaurant => {
            const stat = statsMap[restaurant._id.toString()] || { totalOrders: 0, revenue: 0, commission: 0 };
            return {
                ...restaurant,
                totalOrders: stat.totalOrders,
                revenue: stat.revenue,
                commission: stat.commission
            };
        });

        // Sort by newest first
        enrichedRestaurants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(`Returning ${enrichedRestaurants.length} enriched restaurants`);
        res.json(enrichedRestaurants);
    } catch (error) {
        console.error('Error in getAllRestaurants:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all riders
const getAllRiders = async (req, res) => {
    try {
        console.log('Fetching all riders for admin...');
        const todayStr = new Date().toISOString().split('T')[0];

        const riders = await Rider.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { _id: 1, name: 1, email: 1, phone: 1, phoneNumber: 1, status: 1, createdAt: 1 } }
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
                    from: 'riderwallets',
                    localField: '_id',
                    foreignField: 'rider',
                    as: 'walletDetails'
                }
            },
            {
                $lookup: {
                    from: 'riderbonuses',
                    let: { riderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$rider', '$$riderId'] },
                                        { $eq: ['$date', todayStr] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'bonusDetails'
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
                                        { $not: { $in: ['$status', ['Cancelled']] } }
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
                    wallet: { $ifNull: [{ $arrayElemAt: ['$walletDetails', 0] }, {}] },
                    bonus: { $ifNull: [{ $arrayElemAt: ['$bonusDetails', 0] }, null] },
                    totalOrders: { $size: '$allOrders' },
                    documents: { $ifNull: ['$documents', {}] }
                }
            },
            {
                $addFields: {
                    totalEarnings: { $ifNull: ['$earnings.total', { $ifNull: ['$wallet.totalEarnings', 0] }] },
                    cashCollected: { $ifNull: ['$cod_balance', { $ifNull: ['$wallet.cashCollected', 0] }] },
                    availableWithdraw: { $ifNull: ['$earnings_balance', { $ifNull: ['$wallet.availableWithdraw', 0] }] }
                }
            },
            {
                $addFields: {
                    totalEarnings: { $ifNull: ['$totalEarnings', 0] },
                    cashCollected: { $ifNull: ['$cashCollected', 0] },
                    availableWithdraw: { $ifNull: ['$availableWithdraw', 0] }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        console.log(`Found ${riders.length} riders. Calculating today stats...`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ridersWithStats = riders.map(rider => {
            const todayOrders = (rider.allOrders || []).filter(o => new Date(o.createdAt) >= today).length;
            return {
                ...rider,
                todayOrders,
                allOrders: undefined
            };
        });

        console.log(`Returning ${ridersWithStats.length} riders with stats`);
        res.json(ridersWithStats);
    } catch (error) {
        console.error('Error in getAllRiders:', error);
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
                    totalSales: { $sum: { $convert: { input: { $ifNull: ['$subtotal', { $ifNull: ['$totalPrice', 0] }] }, to: 'double', onError: 0, onNull: 0 } } },
                    orderCount: { $sum: 1 },
                    commission: { $sum: { $convert: { input: { $ifNull: ['$commissionAmount', { $multiply: [{ $convert: { input: { $ifNull: ['$subtotal', { $ifNull: ['$totalPrice', 0] }] }, to: 'double', onError: 0, onNull: 0 } }, 0.15] }] }, to: 'double', onError: 0, onNull: 0 } } },
                    netPayable: { $sum: { $convert: { input: { $ifNull: ['$restaurantEarning', { $multiply: [{ $convert: { input: { $ifNull: ['$subtotal', { $ifNull: ['$totalPrice', 0] }] }, to: 'double', onError: 0, onNull: 0 } }, 0.85] }] }, to: 'double', onError: 0, onNull: 0 } } }
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
                    commission: 1,
                    netPayable: 1
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
                    revenue: { $sum: { $convert: { input: { $ifNull: ["$totalPrice", 0] }, to: 'double', onError: 0, onNull: 0 } } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(dailyOrders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get system settings
const getSystemSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update system settings
const updateSystemSettings = async (req, res) => {
    try {
        const {
            commission,
            commissionRate,
            taxRate,
            isTaxEnabled,
            supportEmail,
            supportPhone,
            announcement,
            isMaintenanceMode,
            minimumOrderAmount,
            deliveryFee,
            deliveryFeeBase,
            deliveryFeePerKm,
            deliveryFeeMax,
            serviceFee,
            featureToggles,
            safepay,
            googleMapsApiKey,
            appVersion,
            appConfig
        } = req.body;

        let settings = await Settings.getSettings();

        if (commission !== undefined) settings.commission = commission;
        if (commissionRate !== undefined) settings.commissionRate = commissionRate;
        if (taxRate !== undefined) settings.taxRate = taxRate;
        if (isTaxEnabled !== undefined) settings.isTaxEnabled = isTaxEnabled;
        if (supportEmail !== undefined) settings.supportEmail = supportEmail;
        if (supportPhone !== undefined) settings.supportPhone = supportPhone;
        if (announcement !== undefined) settings.announcement = announcement;
        if (isMaintenanceMode !== undefined) settings.isMaintenanceMode = isMaintenanceMode;
        if (minimumOrderAmount !== undefined) settings.minimumOrderAmount = minimumOrderAmount;
        if (deliveryFee !== undefined) settings.deliveryFee = deliveryFee;
        if (deliveryFeeBase !== undefined) settings.deliveryFeeBase = deliveryFeeBase;
        if (deliveryFeePerKm !== undefined) settings.deliveryFeePerKm = deliveryFeePerKm;
        if (deliveryFeeMax !== undefined) settings.deliveryFeeMax = deliveryFeeMax;
        if (serviceFee !== undefined) settings.serviceFee = serviceFee;
        if (googleMapsApiKey !== undefined) settings.googleMapsApiKey = googleMapsApiKey;

        if (featureToggles) {
            settings.featureToggles = { ...settings.featureToggles, ...featureToggles };
        }

        if (safepay) {
            settings.safepay = { ...settings.safepay, ...safepay };
        }

        if (appVersion) {
            settings.appVersion = { ...settings.appVersion, ...appVersion };
        }

        if (appConfig) {
            settings.appConfig = { ...settings.appConfig, ...appConfig };
        }

        await settings.save();

        // Emit socket event for admin real-time update (so other admins see it)
        triggerEvent('admin', 'stats_updated', { type: 'settings_updated' });

        res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Sync Firebase users with MongoDB
const syncFirebaseUsers = async (req, res) => {
    try {
        const { admin } = require('../config/firebase');
        const listUsersResult = await admin.auth().listUsers();
        const firebaseUsers = listUsersResult.users;

        let syncedCount = 0;
        let updatedCount = 0;

        for (const fbUser of firebaseUsers) {
            const email = fbUser.email;
            if (!email) continue;

            // Check if user exists in MongoDB for any role
            // We search for the email case-insensitively
            let existingUser = await User.findOne({
                email: { $regex: new RegExp(`^${email}$`, 'i') }
            });

            if (!existingUser) {
                // Create as customer by default if missing
                await User.create({
                    name: fbUser.displayName || 'Firebase User',
                    email: email,
                    phone: fbUser.phoneNumber || undefined,
                    password: '',
                    role: 'customer',
                    firebaseUid: fbUser.uid,
                    status: 'active',
                    lastLogin: fbUser.metadata.lastSignInTime ? new Date(fbUser.metadata.lastSignInTime) : null
                });
                syncedCount++;
            } else {
                // Update existing user with Firebase details if missing
                let modified = false;
                if (!existingUser.firebaseUid) {
                    existingUser.firebaseUid = fbUser.uid;
                    modified = true;
                }

                // Track last login from Firebase
                if (fbUser.metadata.lastSignInTime) {
                    const fbLastLogin = new Date(fbUser.metadata.lastSignInTime);
                    if (!existingUser.lastLogin || fbLastLogin > existingUser.lastLogin) {
                        existingUser.lastLogin = fbLastLogin;
                        modified = true;
                    }
                }

                if (modified) {
                    await existingUser.save();
                    updatedCount++;
                }
            }
        }

        console.log(`[Sync] Firebase Sync completed: ${syncedCount} created, ${updatedCount} updated`);

        // Audit Log
        await AuditLog.create({
            event: 'SYNC_FIREBASE',
            details: {
                syncedCount,
                updatedCount,
                totalFirebaseUsers: firebaseUsers.length
            }
        });

        res.json({
            message: 'Sync completed',
            syncedCount,
            updatedCount,
            totalFirebaseUsers: firebaseUsers.length
        });
    } catch (error) {
        console.error('❌ Firebase Sync Error:', error);
        res.status(500).json({ message: 'Error syncing users', error: error.message });
    }
};

/**
 * @desc    Verify users between Firebase and MongoDB
 * @route   GET /api/admin/verify-users
 * @access  Private/Admin
 */
const verifyUsers = async (req, res) => {
    try {
        const { admin } = require('../config/firebase');
        const listUsersResult = await admin.auth().listUsers();
        const firebaseUsers = listUsersResult.users;
        const mongoUsers = await User.find({}, 'email firebaseUid role');

        const discrepancies = [];

        // 1. Check Firebase users missing in MongoDB
        for (const fbUser of firebaseUsers) {
            const existsInMongo = mongoUsers.find(u =>
                u.email?.toLowerCase() === fbUser.email?.toLowerCase() ||
                u.firebaseUid === fbUser.uid
            );

            if (!existsInMongo) {
                discrepancies.push({
                    type: 'MISSING_IN_MONGO',
                    firebaseUser: {
                        uid: fbUser.uid,
                        email: fbUser.email,
                        displayName: fbUser.displayName
                    },
                    severity: 'high'
                });
            }
        }

        // 2. Check MongoDB users missing Firebase UID (but should have one if they use social login)
        // We only care about users who are likely social users or have been synced before
        for (const mUser of mongoUsers) {
            const existsInFirebase = firebaseUsers.find(u =>
                u.email?.toLowerCase() === mUser.email?.toLowerCase() ||
                u.uid === mUser.firebaseUid
            );

            if (!existsInFirebase && mUser.firebaseUid) {
                discrepancies.push({
                    type: 'MISSING_IN_FIREBASE',
                    mongoUser: {
                        id: mUser._id,
                        email: mUser.email,
                        firebaseUid: mUser.firebaseUid
                    },
                    severity: 'medium'
                });
            }
        }

        res.json({
            totalFirebase: firebaseUsers.length,
            totalMongo: mongoUsers.length,
            discrepancyCount: discrepancies.length,
            discrepancies
        });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

// @desc    Get all users with stats
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
                    totalSpent: {
                        $sum: {
                            $map: {
                                input: '$orders',
                                as: 'o',
                                in: { $convert: { input: { $ifNull: ['$$o.totalPrice', { $ifNull: ['$$o.totalAmount', 0] }] }, to: 'double', onError: 0, onNull: 0 } }
                            }
                        }
                    },
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
                    lastLogin: 1,
                    firebaseUid: 1,
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

// @desc    Delete a user
const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        let user = await User.findById(id);

        // If user not found, check if it's a Rider ID or Restaurant ID being passed
        if (!user) {
            console.log(`🔍 User not found with ID ${id}, checking for Rider/Restaurant...`);

            // Check if it's a Rider ID
            const rider = await Rider.findById(id);
            if (rider) {
                console.log(`🗑️ Deleting rider directly: ${rider.fullName}`);
                const riderId = rider._id;
                await Promise.all([
                    RiderWallet.deleteMany({ rider: riderId }),
                    RiderBonus.deleteMany({ rider: riderId }),
                    CODLedger.deleteMany({ rider: riderId }),
                    Notification.deleteMany({ user: rider.user }),
                    Rider.findByIdAndDelete(riderId)
                ]);

                // Audit Log
                await AuditLog.create({
                    event: 'RIDER_DELETED',
                    email: rider.fullName,
                    details: { deletedBy: req.admin?._id || req.user?._id || 'system', direct: true }
                }).catch(e => console.warn('Audit failed:', e.message));

                return res.json({ message: 'Rider record deleted successfully' });
            }

            // Check if it's a Restaurant ID
            const restaurant = await Restaurant.findById(id);
            if (restaurant) {
                console.log(`🗑️ Deleting restaurant directly: ${restaurant.name}`);
                const restaurantId = restaurant._id;
                await Promise.all([
                    Dish.deleteMany({ restaurant: restaurantId }),
                    Video.deleteMany({ restaurant: restaurantId }),
                    RestaurantWallet.deleteMany({ restaurant: restaurantId }),
                    Review.deleteMany({ restaurant: restaurantId }),
                    Notification.deleteMany({ user: restaurant.owner }),
                    Restaurant.findByIdAndDelete(restaurantId)
                ]);

                // Audit Log
                await AuditLog.create({
                    event: 'RESTAURANT_DELETED',
                    email: restaurant.name,
                    details: { deletedBy: req.admin?._id || req.user?._id || 'system', direct: true }
                }).catch(e => console.warn('Audit failed:', e.message));

                return res.json({ message: 'Restaurant record deleted successfully' });
            }

            return res.status(404).json({ message: 'User or Partner not found' });
        }

        console.log(`🗑️ Deleting user: ${user.email} (${user.role})`);

        if (user.role === 'restaurant') {
            const restaurant = await Restaurant.findOne({ owner: user._id });
            if (restaurant) {
                console.log(`🗑️ Deleting associated restaurant: ${restaurant.name}`);
                const restaurantId = restaurant._id;
                await Promise.all([
                    Dish.deleteMany({ restaurant: restaurantId }),
                    Video.deleteMany({ restaurant: restaurantId }),
                    RestaurantWallet.deleteMany({ restaurant: restaurantId }),
                    Review.deleteMany({ restaurant: restaurantId }),
                    Notification.deleteMany({ user: user._id }),
                    Restaurant.findByIdAndDelete(restaurantId)
                ]);
            }
        }
        if (user.role === 'rider') {
            const rider = await Rider.findOne({ user: user._id });
            if (rider) {
                console.log(`🗑️ Deleting associated rider profile: ${rider.fullName || rider.name}`);
                const riderId = rider._id;
                await Promise.all([
                    RiderWallet.deleteMany({ rider: riderId }),
                    RiderBonus.deleteMany({ rider: riderId }),
                    CODLedger.deleteMany({ rider: riderId }),
                    Notification.deleteMany({ user: user._id }),
                    Rider.findByIdAndDelete(riderId)
                ]);
            }
        }

        await User.findByIdAndDelete(id);

        // Notify admins to refresh UI
        try {
            triggerEvent('admin', 'restaurant_updated');
            triggerEvent('admin', 'rider_updated');
            triggerEvent('admin', 'user_updated');
            triggerEvent('admin', 'stats_updated');
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        // Audit Log
        try {
            await AuditLog.create({
                event: 'USER_DELETED',
                email: user.email,
                details: { deletedBy: req.admin?._id || req.user?._id || 'system', role: user.role }
            });
        } catch (auditErr) {
            console.warn('⚠️ Audit log creation failed:', auditErr.message);
        }

        // Notify admins to refresh UI
        try {
            triggerEvent('admin', 'restaurant_updated');
            triggerEvent('admin', 'rider_updated');
            triggerEvent('admin', 'user_updated');
            triggerEvent('admin', 'stats_updated');
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'User and associated data deleted successfully' });
    } catch (error) {
        console.error('❌ Delete User Error:', error);
        res.status(500).json({ message: 'Server error during user deletion', error: error.message });
    }
};

// @desc    Delete a restaurant
const deleteRestaurant = async (req, res) => {
    try {
        const restaurantId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Invalid Restaurant ID format' });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        console.log(`🗑️ Deleting restaurant: ${restaurant.name}`);

        // Delete all associated data
        await Dish.deleteMany({ restaurant: restaurant._id });
        await Video.deleteMany({ restaurant: restaurant._id });
        await RestaurantWallet.deleteMany({ restaurant: restaurant._id });

        // Delete the restaurant
        await Restaurant.findByIdAndDelete(restaurantId);

        // Audit Log
        try {
            await AuditLog.create({
                event: 'RESTAURANT_DELETED',
                details: {
                    restaurantId,
                    name: restaurant.name,
                    deletedBy: req.admin?._id || req.user?._id || 'system'
                }
            });
        } catch (auditErr) {
            console.warn('⚠️ Audit log creation failed:', auditErr.message);
        }

        // Notify admins
        try {
            triggerEvent('admin', 'restaurant_updated');
            triggerEvent('admin', 'stats_updated');
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Restaurant and its associated data deleted successfully' });
    } catch (error) {
        console.error('❌ Delete Restaurant Error:', error);
        res.status(500).json({ message: 'Server error during restaurant deletion', error: error.message });
    }
};

// @desc    Delete a rider
const deleteRider = async (req, res) => {
    try {
        const riderId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(riderId)) {
            return res.status(400).json({ message: 'Invalid Rider ID format' });
        }

        const rider = await Rider.findById(riderId);
        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        console.log(`🗑️ Deleting rider: ${rider.fullName || rider.name}`);

        // Delete associated data
        await RiderWallet.deleteMany({ rider: rider._id });
        await Rider.findByIdAndDelete(riderId);

        // Audit Log
        try {
            await AuditLog.create({
                event: 'RIDER_DELETED',
                details: {
                    riderId,
                    name: rider.fullName || rider.name,
                    deletedBy: req.admin?._id || req.user?._id || 'system'
                }
            });
        } catch (auditErr) {
            console.warn('⚠️ Audit log creation failed:', auditErr.message);
        }

        // Notify admins
        try {
            triggerEvent('admin', 'rider_updated');
            triggerEvent('admin', 'user_updated');
            triggerEvent('admin', 'stats_updated');
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Rider and its associated data deleted successfully' });
    } catch (error) {
        console.error('❌ Delete Rider Error:', error);
        res.status(500).json({ message: 'Server error during rider deletion', error: error.message });
    }
};

// @desc    Cleanup all mock data from the system
const cleanupMockData = async (req, res) => {
    try {
        console.log('🧹 Manual cleanup triggered by admin...');

        // 1. Run fixInflatedOrders logic first to clean up any bad historical data
        console.log('🛠️ FIXING INFLATED ORDERS AS PART OF CLEANUP');
        const ordersToFix = await Order.find({
            riderEarning: { $exists: true }
        });

        for (let order of ordersToFix) {
            // Ensure netRiderEarning and grossRiderEarning match riderEarning
            if (order.riderEarning) {
                order.netRiderEarning = order.riderEarning;
                order.grossRiderEarning = order.riderEarning;

                // Recalculate admin earning for this order without caps
                const commissionAmount = order.commissionAmount || 0;
                const deliveryFee = order.deliveryFee || 0;
                order.adminEarning = commissionAmount + (deliveryFee - order.riderEarning);

                await order.save();
            }
        }

        // 2. Fix RiderWallets
        const wallets = await RiderWallet.find({});
        for (let wallet of wallets) {
            const riderOrders = await Order.find({
                rider: wallet.rider,
                status: { $in: ['Delivered', 'Completed'] }
            });
            const correctTotalEarnings = riderOrders.reduce((sum, o) => sum + (o.riderEarning || 0), 0);
            wallet.totalEarnings = correctTotalEarnings;
            wallet.availableWithdraw = correctTotalEarnings;
            await wallet.save();
        }

        // 3. Run original seeder if needed (optional, but let's keep it safe)
        const seedData = require('../seederFunction');
        // await seedData(); // Commented out to avoid wiping everything, just fixing data

        // Notify all admins to refresh their dashboards
        try {
            triggerEvent('admin', 'restaurant_updated');
            triggerEvent('admin', 'stats_updated');
            triggerEvent('admin', 'notification', {
                type: 'success',
                message: 'Data cleanup and inflation fix completed successfully'
            });
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Data cleanup and inflation fix completed successfully. All dashboards will refresh.' });
    } catch (error) {
        console.error('Cleanup failed:', error);
        res.status(500).json({ message: 'Cleanup failed', error: error.message });
    }
};

// @desc    Get all riders with COD details
// @route   GET /api/admin/cod-ledger
// @access  Private/Admin
const getCODLedger = async (req, res) => {
    try {
        // 1. First, let's sync rider cod_balance from pending ledger entries to be sure
        const allRiders = await Rider.find();
        for (let rider of allRiders) {
            const pendingTx = await CODLedger.find({ rider: rider._id, status: 'pending' });
            const totalCod = pendingTx.reduce((sum, tx) => sum + (tx.cod_collected || 0), 0);

            // If there's a mismatch, update the rider's cod_balance
            if (rider.cod_balance !== totalCod) {
                rider.cod_balance = totalCod;
                await rider.save();
            }
        }

        const riders = await Rider.find()
            .populate('user', 'name email phone')
            .select('fullName cod_balance earnings_balance settlementStatus lastSettlementDate user');

        const ledger = await CODLedger.find({ status: 'pending' })
            .populate('rider', 'fullName')
            .populate('order', 'orderNumber totalPrice')
            .sort({ createdAt: -1 });

        res.json({ riders, pendingTransactions: ledger });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Settle rider COD and earnings
// @route   POST /api/admin/settle-rider
// @access  Private/Admin
const settleRider = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { riderId, amountCollected, earningsPaid, transactionId, notes } = req.body;

        const rider = await Rider.findById(riderId).session(session);
        if (!rider) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Rider not found' });
        }

        // Update rider balances
        if (amountCollected) {
            rider.cod_balance = Math.max(0, rider.cod_balance - amountCollected);
        }
        if (earningsPaid) {
            rider.earnings_balance = Math.max(0, rider.earnings_balance - earningsPaid);
        }

        // Update settlement status if balances are cleared
        if (rider.cod_balance <= 20000) {
            rider.settlementStatus = 'active';
        }
        rider.lastSettlementDate = Date.now();
        await rider.save({ session });

        // Update RiderWallet as well
        let riderWallet = await RiderWallet.findOne({ rider: riderId }).session(session);
        if (riderWallet) {
            if (amountCollected) {
                riderWallet.cashCollected = Math.max(0, (riderWallet.cashCollected || 0) - amountCollected);
            }
            if (earningsPaid) {
                riderWallet.availableWithdraw = Math.max(0, (riderWallet.availableWithdraw || 0) - earningsPaid);
            }
            await riderWallet.save({ session });
        }

        // Mark related ledger entries as paid
        await CODLedger.updateMany(
            { rider: riderId, status: 'pending' },
            {
                status: 'paid',
                settlementDate: Date.now(),
                transactionId: transactionId || 'Admin-Manual'
            },
            { session }
        );

        // Log the settlement
        await AuditLog.create([{
            event: 'SETTLE_RIDER',
            userId: req.admin?._id || req.user?._id || 'system',
            details: {
                riderId,
                amountCollected,
                earningsPaid,
                notes
            }
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // Trigger real-time update
        try {
            const riderData = rider.toObject ? rider.toObject() : rider;
            triggerEvent(`rider-${riderId}`, 'wallet_updated', {
                cod_balance: riderData.cod_balance,
                earnings_balance: riderData.earnings_balance,
                settlementStatus: riderData.settlementStatus
            });
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Rider settled successfully', rider });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Settlement Error:', error);
        res.status(500).json({ message: 'Server error during settlement', error: error.message });
    }
};

// @desc    Block/Unblock rider
// @route   POST /api/admin/riders/:id/block
// @access  Private/Admin
const blockRider = async (req, res) => {
    try {
        const { status } = req.body; // 'blocked' or 'active'
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        rider.settlementStatus = status;
        await rider.save();

        res.json({ message: `Rider ${status} successfully`, rider });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get counts for admin dashboard badges
 * @route   GET /api/admin/notification-counts
 */
const getNotificationCounts = async (req, res) => {
    console.log('🔔 [getNotificationCounts] API HIT');
    const startTime = Date.now();
    try {
        const [
            pendingRestaurants,
            pendingRiders,
            newOrders,
            newUsers
        ] = await Promise.all([
            Restaurant.countDocuments({ verificationStatus: 'pending' }).maxTimeMS(5000),
            Rider.countDocuments({ verificationStatus: 'pending' }).maxTimeMS(5000),
            Order.countDocuments({ status: 'Pending' }).maxTimeMS(5000),
            User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                role: 'customer'
            }).maxTimeMS(5000)
        ]);

        console.log(`✅ [getNotificationCounts] Finished in ${Date.now() - startTime}ms`);
        res.json({
            pendingRestaurants,
            pendingRiders,
            newOrders,
            newUsers,
            totalNotifications: pendingRestaurants + pendingRiders + newOrders + newUsers
        });
    } catch (error) {
        console.error('🔥 [getNotificationCounts] Error:', error);
        res.status(500).json({ message: 'Error fetching notification counts', error: error.message });
    }
};

/**
 * @desc    NUCLEAR WIPE - DANGER!
 * @route   GET /api/admin/nuclear-wipe
 */
const nuclearWipe = async (req, res) => {
    try {
        console.log('☢️ NUCLEAR WIPE INITIATED via API');

        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
            console.log(`- Cleared collection: ${key}`);
        }

        // Create Fresh Super Admin
        const email = 'superadmin@foodswipe.com';
        const password = 'password123';

        await User.create({
            name: 'Super Admin',
            email,
            password,
            role: 'admin',
            status: 'active',
            phone: '03000000000'
        });

        await Admin.create({
            name: 'Super Admin',
            email,
            password,
            role: 'super-admin',
            status: 'active'
        });

        res.json({ message: 'Nuclear wipe complete. Super admin recreated.', database: mongoose.connection.name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Fix inflated orders (one-time fix)
 * @route   GET /api/admin/fix-inflated-orders
 */
const fixInflatedOrders = async (req, res) => {
    try {
        console.log('🛠️ FIX INFLATED ORDERS INITIATED');

        // 1. Fix Orders (Remove any artificial caps)
        const orders = await Order.find({});

        console.log(`Checking ${orders.length} orders for balance sync`);
        let fixedOrdersCount = 0;
        for (let order of orders) {
            // Just ensure netRiderEarning and grossRiderEarning match riderEarning
            if (order.riderEarning) {
                order.netRiderEarning = order.riderEarning;
                order.grossRiderEarning = order.riderEarning;
                await order.save();
                fixedOrdersCount++;
            }
        }

        // 2. Fix RiderWallets and Rider Profiles (Recalculate based on fixed orders)
        const RiderWallet = require('../models/RiderWallet');
        const CODLedger = require('../models/CODLedger');
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

            // Fix Wallet
            wallet.totalEarnings = correctTotalEarnings;
            wallet.availableWithdraw = correctTotalEarnings; // Resetting to total for simplicity in cleanup
            await wallet.save();

            // Fix Rider Profile
            const rider = await Rider.findById(riderId);
            if (rider) {
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
            fixedWalletsCount++;
        }

        res.json({
            message: 'Fix complete',
            foundOrders: orders.length,
            fixedOrders: fixedOrdersCount,
            fixedWallets: fixedWalletsCount
        });
    } catch (err) {
        console.error('Fix error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get all active admin notifications
 * @route   GET /api/admin/notifications
 */
const getAdminNotifications = async (req, res) => {
    try {
        const Notification = require('../models/Notification');

        // Find notifications where recipient is the current admin or generic admin notifications
        // In our system, recipient is specifically set in adminNotifier.js
        const recipientId = req.admin?._id || req.user?._id;
        if (!recipientId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const notifications = await Notification.find({ recipient: recipientId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/admin/notifications/:id/read
 */
const markNotificationRead = async (req, res) => {
    try {
        const Notification = require('../models/Notification');
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification', error: error.message });
    }
};

/**
 * @desc    Manually assign a rider to an order
 * @route   POST /api/admin/orders/:id/assign-rider
 * @access  Private/Admin
 */
const assignRiderToOrder = async (req, res) => {
    try {
        const { riderId } = req.body;
        const orderId = req.params.id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const rider = await Rider.findById(riderId).populate('user');
        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        // 1. Handle previous rider if any
        if (order.rider && order.rider.toString() !== riderId) {
            const prevRider = await Rider.findById(order.rider).populate('user', 'name email phone');
            if (prevRider) {
                prevRider.currentOrder = null;
                prevRider.status = 'Available';
                await prevRider.save();

                // Notify previous rider
                try {
                    const prevRiderData = prevRider.toObject ? prevRider.toObject() : prevRider;
                    triggerEvent(`rider-${prevRider._id}`, 'orderUnassigned', { orderId });
                    triggerEvent(`rider-${prevRider._id}`, 'orderStatusUpdate', { _id: orderId, status: 'Unassigned' });
                    // Notify admins about status change
                    triggerEvent('admin', 'rider_status_updated', prevRiderData);
                } catch (socketErr) {
                    console.warn('⚠️ Socket notification failed:', socketErr.message);
                }
            }
        }

        // 2. Assign new rider to order
        order.rider = riderId;
        order.riderAcceptedAt = order.riderAcceptedAt || new Date();

        // Calculate earnings if not present
        if (!order.netRiderEarning) {
            const settings = await Settings.getSettings();
            let distance = order.distanceKm || 0;
            const earnings = calculateRiderEarning(distance, settings);
            order.netRiderEarning = earnings.netEarning;
            order.grossRiderEarning = earnings.grossEarning;
            order.riderEarning = earnings.netEarning;
        }

        await order.save();

        // 3. Update new rider status
        rider.currentOrder = orderId;
        rider.status = 'Busy';
        await rider.save();

        // Notify admins about status change
        try {
            const riderData = rider.toObject ? rider.toObject() : rider;
            triggerEvent('admin', 'rider_status_updated', riderData);
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        const updatedOrder = await Order.findById(orderId)
            .populate('user', 'name phone')
            .populate('restaurant', 'name address location contact')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone' }
            });

        // 4. Trigger events
        try {
            const orderData = updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder;
            triggerEvent(`rider-${riderId}`, 'orderAssigned', orderData);
            triggerEvent(`rider-${riderId}`, 'orderStatusUpdate', orderData);
            triggerEvent(`user-${order.user}`, 'orderStatusUpdate', orderData);
            triggerEvent(`restaurant-${order.restaurant}`, 'orderStatusUpdate', orderData);
            triggerEvent('admin', 'order_updated', orderData);
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'Rider assigned successfully', order: updatedOrder });
    } catch (error) {
        console.error('Assign rider error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Suspend a user (Customer, Restaurant, or Rider)
// @route   POST /api/admin/users/:id/suspend
// @access  Private/Admin
const suspendUser = async (req, res) => {
    try {
        const { reason, durationWeeks = 1 } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const suspendedAt = new Date();
        const unsuspendAt = new Date();
        unsuspendAt.setDate(suspendedAt.getDate() + (durationWeeks * 7));

        user.status = 'suspended';
        user.suspensionDetails = {
            isSuspended: true,
            suspendedAt,
            unsuspendAt,
            reason: reason || 'Violation of terms',
            history: [
                ...(user.suspensionDetails?.history || []),
                {
                    action: 'suspended',
                    date: suspendedAt,
                    reason: reason || 'Violation of terms',
                    adminId: req.admin?._id || req.user?._id || 'system'
                }
            ]
        };

        await user.save();

        // If restaurant, deactivate it
        if (user.role === 'restaurant') {
            await Restaurant.findOneAndUpdate({ owner: user._id }, { isActive: false });
        }

        // If rider, go offline
        if (user.role === 'rider') {
            await Rider.findOneAndUpdate({ user: user._id }, { isOnline: false, status: 'Offline' });
        }

        // Audit Log
        await AuditLog.create({
            event: user.role === 'restaurant' ? 'RESTAURANT_SUSPENDED' :
                user.role === 'rider' ? 'RIDER_SUSPENDED' : 'USER_SUSPENDED',
            userId: user._id,
            email: user.email,
            role: user.role,
            details: { reason, durationWeeks, suspendedBy: req.admin?._id || req.user?._id || 'system', unsuspendAt }
        });

        try {
            const userData = user.toObject ? user.toObject() : user;
            triggerEvent('admin', 'user_updated', userData);
            triggerEvent('admin', 'notification', {
                type: 'warning',
                message: `${user.role.toUpperCase()} ${user.name} has been suspended for ${durationWeeks} week(s)`
            });
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'User suspended successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Unsuspend a user
// @route   POST /api/admin/users/:id/unsuspend
// @access  Private/Admin
const unsuspendUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = 'active';
        user.suspensionDetails.isSuspended = false;
        user.suspensionDetails.history.push({
            action: 'unsuspended',
            date: new Date(),
            reason: 'Manual unsuspend by admin',
            adminId: req.admin?._id || req.user?._id || 'system'
        });

        await user.save();

        // If restaurant, reactivate it if approved
        if (user.role === 'restaurant') {
            const restaurant = await Restaurant.findOne({ owner: user._id });
            if (restaurant && restaurant.verificationStatus === 'approved') {
                restaurant.isActive = true;
                await restaurant.save();
            }
        }

        // Audit Log
        await AuditLog.create({
            event: user.role === 'restaurant' ? 'RESTAURANT_UNSUSPENDED' :
                user.role === 'rider' ? 'RIDER_UNSUSPENDED' : 'USER_UNSUSPENDED',
            userId: user._id,
            email: user.email,
            role: user.role,
            details: { unsuspendedBy: req.admin?._id || req.user?._id || 'system' }
        });

        try {
            const userData = user.toObject ? user.toObject() : user;
            triggerEvent('admin', 'user_updated', userData);
        } catch (socketErr) {
            console.warn('⚠️ Socket notification failed:', socketErr.message);
        }

        res.json({ message: 'User unsuspended successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get suspension and deletion history
// @route   GET /api/admin/history
// @access  Private/Admin
const getActionHistory = async (req, res) => {
    try {
        const history = await AuditLog.find({
            event: {
                $in: [
                    'USER_SUSPENDED', 'USER_UNSUSPENDED', 'USER_DELETED',
                    'RESTAURANT_SUSPENDED', 'RESTAURANT_UNSUSPENDED', 'RESTAURANT_DELETED',
                    'RIDER_SUSPENDED', 'RIDER_UNSUSPENDED', 'RIDER_DELETED'
                ]
            }
        })
            .populate('userId', 'name email role avatar')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getPendingRestaurants,
    approveRestaurant,
    rejectRestaurant,
    getAllOrders,
    getDashboardStats,
    getQuickStats,
    getFinanceStats,
    getAllRestaurants,
    getAllRiders,
    approveRider,
    rejectRider,
    resetRider,
    getRestaurantSales,
    getDailyStats,
    getSystemSettings,
    updateSystemSettings,
    getUsers,
    syncFirebaseUsers,
    verifyUsers,
    suspendUser,
    unsuspendUser,
    deleteUser,
    deleteRestaurant,
    deleteRider,
    cleanupMockData,
    getCODLedger,
    settleRider,
    blockRider,
    getNotificationCounts,
    getAdminNotifications,
    markNotificationRead,
    nuclearWipe,
    fixInflatedOrders,
    assignRiderToOrder,
    getActionHistory
};
