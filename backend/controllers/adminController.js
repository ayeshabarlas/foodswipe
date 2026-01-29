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
const { triggerEvent } = require('../socket');
const AuditLog = require('../models/AuditLog');
const Admin = require('../models/Admin');
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

        // Notify admins about status update
        triggerEvent('admin', 'restaurant_updated', restaurant);
        triggerEvent('admin', 'stats_updated');
        triggerEvent('admin', 'notification', {
            type: 'info',
            message: `Restaurant ${restaurant.name} approved`
        });

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
        triggerEvent('admin', 'restaurant_updated', restaurant);
        triggerEvent('admin', 'stats_updated');
        triggerEvent('admin', 'notification', {
            type: 'warning',
            message: `Restaurant ${restaurant.name} rejected: ${reason || 'No reason provided'}`
        });

        res.json({ message: 'Restaurant rejected', restaurant });
    } catch (error) {
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

        // Notify admins about status update
        triggerEvent('admin', 'rider_updated', rider);
        triggerEvent('admin', 'user_updated');
        triggerEvent('admin', 'stats_updated');
        triggerEvent('admin', 'notification', {
            type: 'info',
            message: `Rider ${rider.fullName} approved`
        });

        res.json({ message: 'Rider approved successfully', rider });
    } catch (error) {
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

        // Notify admins about status update
        triggerEvent('admin', 'rider_updated', rider);
        triggerEvent('admin', 'user_updated');

        res.json({ message: 'Rider rejected', rider });
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
        const totalRestaurants = await Restaurant.countDocuments({}); // Count all restaurants
        const pendingRestaurants = await Restaurant.countDocuments({ verificationStatus: 'pending' });
        const totalOrders = await Order.countDocuments({});
        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: todayStart }
        });

        // Calculate Revenue & Commission (Total & Today)
        const totalStatsResult = await Order.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'Rejected'] } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
                    totalCommission: { $sum: { $ifNull: ['$commissionAmount', 0] } },
                    totalRiderEarnings: { $sum: { $toDouble: { $ifNull: ['$riderEarning', 0] } } },
                    totalRestaurantEarnings: { $sum: { $toDouble: { $ifNull: ['$restaurantEarning', 0] } } },
                    totalServiceFees: { $sum: { $toDouble: { $ifNull: ['$serviceFee', 0] } } },
                    totalTax: { $sum: { $toDouble: { $ifNull: ['$tax', 0] } } },
                    totalGatewayFees: { $sum: { $toDouble: { $ifNull: ['$gatewayFee', 0] } } },
                    totalDiscounts: { $sum: { $toDouble: { $ifNull: ['$discount', 0] } } },
                    totalDeliveryFees: { $sum: { $toDouble: { $ifNull: ['$deliveryFee', 0] } } }
                }
            }
        ]);

        const totalRevenue = totalStatsResult[0]?.totalRevenue || 0;
        const totalCommission = totalStatsResult[0]?.totalCommission || 0;
        const totalRiderEarnings = totalStatsResult[0]?.totalRiderEarnings || 0;
        const totalRestaurantEarnings = totalStatsResult[0]?.totalRestaurantEarnings || 0;
        const totalDeliveryFees = totalStatsResult[0]?.totalDeliveryFees || 0;
        const totalServiceFees = totalStatsResult[0]?.totalServiceFees || 0;
        const totalTax = totalStatsResult[0]?.totalTax || 0;
        const totalGatewayFees = totalStatsResult[0]?.totalGatewayFees || 0;
        const totalDiscounts = totalStatsResult[0]?.totalDiscounts || 0;

        // Calculate Net Platform Profit: Commission + (Delivery Fees - Rider Earnings) + Service Fees + Tax - Gateway Fees - Discounts
        const netPlatformProfit = totalCommission + (totalDeliveryFees - totalRiderEarnings) + totalServiceFees + totalTax - totalGatewayFees - totalDiscounts;

        const todayRevenueResult = await Order.aggregate([
            {
                $match: {
                    status: { $nin: ['Cancelled', 'Rejected'] },
                    createdAt: { $gte: todayStart }
                }
            },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$totalPrice', 0] } } } }
        ]);
        const todayRevenue = todayRevenueResult[0]?.total || 0;

        // Calculate Pending Payouts
        const resWalletStats = await RestaurantWallet.aggregate([
            { $group: { _id: null, totalPending: { $sum: '$pendingPayout' } } }
        ]);
        const riderWalletStats = await RiderWallet.aggregate([
            { $group: { _id: null, totalPending: { $sum: '$availableWithdraw' } } }
        ]);
        const totalPendingPayouts = (resWalletStats[0]?.totalPending || 0) + (riderWalletStats[0]?.totalPending || 0);

        // Revenue Graph Data (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const revenueStatsRaw = await Order.aggregate([
            {
                $match: {
                    status: { $nin: ['Cancelled', 'Rejected'] },
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: { $ifNull: ["$totalPrice", 0] } },
                    commission: { $sum: { $ifNull: ["$commissionAmount", { $multiply: [{ $ifNull: ["$totalPrice", 0] }, 0.15] }] } }
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
                revenue: found ? found.revenue : 0,
                commission: found ? found.commission : 0
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
            inProgress: orderStatusStats.reduce((sum, s) => {
                if (['Pending', 'Confirmed', 'Accepted', 'Preparing', 'Ready', 'Picked Up', 'OnTheWay', 'Arrived', 'ArrivedAtCustomer'].includes(s._id)) {
                    return sum + s.count;
                }
                return sum;
            }, 0)
        };

        // Top Performing Restaurants (by Revenue)
        const topRestaurants = await Order.aggregate([
            { $match: { status: { $in: ['Delivered', 'Completed'] } } },
            {
                $group: {
                    _id: "$restaurant",
                    revenue: { $sum: { $ifNull: ["$totalPrice", 0] } },
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
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('restaurant', 'name')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name' }
            });
        const recentRestaurants = await Restaurant.find().sort({ createdAt: -1 }).limit(3).populate('owner', 'name email status');
        const recentRiders = await Rider.find().sort({ createdAt: -1 }).limit(3).populate('user', 'name email status');

        const recentActivity = [
            ...recentOrders.map(o => ({
                id: o._id,
                type: 'order',
                text: `New order completed`,
                subtext: `Order #${o._id.toString().slice(-5)} ${o.rider ? `(Rider: ${o.rider.fullName || (o.rider.user && o.rider.user.name) || 'Assigned'})` : ''} delivered successfully`,
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
                subtext: `${r.fullName || r.user?.name || 'Rider'} registered as rider`,
                time: r.createdAt
            }))
        ]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);

        // Rider Stats
        const totalRiders = await Rider.countDocuments({}); // Count all riders
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
            netPlatformProfit,
            totalDeliveryFees,
            totalPendingPayouts,
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
        console.log('Fetching all restaurants for admin...');
        const restaurants = await Restaurant.find()
            .populate('owner')
            .lean();

        console.log(`Found ${restaurants.length} restaurants. Enriching with stats...`);

        const enrichedRestaurants = await Promise.all(restaurants.map(async (restaurant) => {
            try {
                const stats = await Order.aggregate([
                    {
                        $match: {
                            restaurant: new mongoose.Types.ObjectId(restaurant._id),
                            status: { $in: ['Delivered', 'Completed'] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: 1 },
                            revenue: { $sum: { $ifNull: ["$subtotal", "$totalPrice"] } },
                            commission: { $sum: { $ifNull: ["$commissionAmount", { $multiply: [{ $ifNull: ["$subtotal", "$totalPrice"] }, 0.15] }] } }
                        }
                    }
                ]);

                const stat = stats[0] || { totalOrders: 0, revenue: 0, commission: 0 };

                return {
                    ...restaurant,
                    owner: restaurant.owner, // Explicitly preserve owner
                    totalOrders: stat.totalOrders,
                    revenue: stat.revenue,
                    commission: stat.commission,
                    // Ensure documents are explicitly included if lean() missed them or they need formatting
                    documents: restaurant.documents || {}
                };
            } catch (err) {
                console.error(`Error enriching restaurant ${restaurant._id}:`, err);
                return {
                    ...restaurant,
                    totalOrders: 0,
                    revenue: 0,
                    commission: 0
                };
            }
        }));

        enrichedRestaurants.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
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
                    totalSales: { $sum: { $ifNull: ['$subtotal', '$totalPrice'] } },
                    orderCount: { $sum: 1 },
                    commission: { $sum: { $ifNull: ['$commissionAmount', { $multiply: [{ $ifNull: ['$subtotal', '$totalPrice'] }, 0.15] }] } },
                    netPayable: { $sum: { $ifNull: ['$restaurantEarning', { $multiply: [{ $ifNull: ['$subtotal', '$totalPrice'] }, 0.85] }] } }
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
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'restaurant') {
            const restaurant = await Restaurant.findOne({ owner: user._id });
            if (restaurant) {
                await Dish.deleteMany({ restaurant: restaurant._id });
                await Restaurant.findByIdAndDelete(restaurant._id);
            }
        }
        if (user.role === 'rider') {
            await Rider.findOneAndDelete({ user: user._id });
        }

        await User.findByIdAndDelete(req.params.id);

        // Audit Log
        await AuditLog.create({
            event: 'USER_DELETED',
            email: user.email,
            details: { deletedBy: req.admin?._id, role: user.role }
        });

        // Notify admins to refresh UI
        triggerEvent('admin', 'restaurant_updated');
        triggerEvent('admin', 'stats_updated');

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
        triggerEvent('admin', 'restaurant_updated');

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
        triggerEvent('admin', 'rider_updated');
        triggerEvent('admin', 'user_updated');
        triggerEvent('admin', 'stats_updated');

        res.json({ message: 'Rider deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
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
        triggerEvent('admin', 'restaurant_updated');
        triggerEvent('admin', 'stats_updated');
        triggerEvent('admin', 'notification', {
            type: 'success',
            message: 'Data cleanup and inflation fix completed successfully'
        });

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
            userId: req.user._id,
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
        triggerEvent(`rider-${riderId}`, 'wallet_updated', {
            cod_balance: rider.cod_balance,
            earnings_balance: rider.earnings_balance,
            settlementStatus: rider.settlementStatus
        });

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
    try {
        const [
            pendingRestaurants,
            pendingRiders,
            newOrders,
            newUsers
        ] = await Promise.all([
            Restaurant.countDocuments({ verificationStatus: 'pending' }),
            Rider.countDocuments({ verificationStatus: 'pending' }),
            Order.countDocuments({ status: 'Pending' }),
            User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                role: 'customer'
            })
        ]);

        res.json({
            pendingRestaurants,
            pendingRiders,
            newOrders,
            newUsers,
            totalNotifications: pendingRestaurants + pendingRiders + newOrders + newUsers
        });
    } catch (error) {
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
        const notifications = await Notification.find({ recipient: req.user._id })
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
                triggerEvent(`rider-${prevRider._id}`, 'orderUnassigned', { orderId });
                triggerEvent(`rider-${prevRider._id}`, 'orderStatusUpdate', { _id: orderId, status: 'Unassigned' });
                // Notify admins about status change
                triggerEvent('admin', 'rider_status_updated', prevRider);
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
        triggerEvent('admin', 'rider_status_updated', rider);

        const updatedOrder = await Order.findById(orderId)
            .populate('user', 'name phone')
            .populate('restaurant', 'name address location contact')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone' }
            });

        // 4. Trigger events
        triggerEvent(`rider-${riderId}`, 'orderAssigned', updatedOrder);
        triggerEvent(`rider-${riderId}`, 'orderStatusUpdate', updatedOrder);
        triggerEvent(`user-${order.user}`, 'orderStatusUpdate', updatedOrder);
        triggerEvent(`restaurant-${order.restaurant}`, 'orderStatusUpdate', updatedOrder);
        triggerEvent('admin', 'order_updated', updatedOrder);

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
                    adminId: req.user._id
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
            details: { reason, durationWeeks, suspendedBy: req.user._id, unsuspendAt }
        });

        triggerEvent('admin', 'user_updated', user);
        triggerEvent('admin', 'notification', {
            type: 'warning',
            message: `${user.role.toUpperCase()} ${user.name} has been suspended for ${durationWeeks} week(s)`
        });

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
            adminId: req.user._id
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
            details: { unsuspendedBy: req.user._id }
        });

        triggerEvent('admin', 'user_updated', user);

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
    getAllRestaurants,
    getAllRiders,
    approveRider,
    rejectRider,
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
