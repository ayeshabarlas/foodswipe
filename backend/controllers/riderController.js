const Rider = require('../models/Rider');
const User = require('../models/User');
const Order = require('../models/Order');
const Payout = require('../models/Payout');
const Transaction = require('../models/Transaction');
const { calculateRiderEarning } = require('../utils/paymentUtils');
const { calculateDistance } = require('../utils/locationUtils');
const { createNotification } = require('./notificationController');

const { triggerEvent } = require('../socket');

/**
 * Normalizes image/video paths to store only the relative path
 * (e.g., from "http://localhost:5000/uploads/file.jpg" to "/uploads/file.jpg")
 */
const normalizePath = (path) => {
    if (!path) return '';
    // Handle array of paths
    if (Array.isArray(path)) {
        return path.map(p => normalizePath(p));
    }
    // If it's a full URL, extract the path part starting from /uploads/
    if (typeof path === 'string' && path.includes('/uploads/')) {
        const index = path.indexOf('/uploads/');
        return path.substring(index);
    }
    return path;
};

// @desc    Register a new rider
// @route   POST /api/riders/register
// @access  Private (Rider role)
const registerRider = async (req, res) => {
    try {
        const { fullName, cnicNumber, dateOfBirth, vehicleType, documents } = req.body;

        // Check if rider already exists for this user
        const existingRider = await Rider.findOne({ user: req.user._id });
        if (existingRider) {
            return res.status(400).json({ message: 'Rider profile already exists' });
        }

        // Create new rider
        const riderData = {
            user: req.user._id,
            fullName,
            cnicNumber,
            dateOfBirth,
            vehicleType,
            verificationStatus: 'new',
        };

        if (documents) {
            riderData.documents = {
                cnicFront: normalizePath(documents.cnicFront),
                cnicBack: normalizePath(documents.cnicBack),
                drivingLicense: normalizePath(documents.drivingLicense),
                vehicleRegistration: normalizePath(documents.vehicleRegistration),
                profileSelfie: normalizePath(documents.profileSelfie),
            };
        }

        const rider = await Rider.create(riderData);

        // Update user role to rider (if not already rider/admin)
        if (req.user.role !== 'rider' && req.user.role !== 'admin') {
            await User.findByIdAndUpdate(req.user._id, { role: 'rider' });
        }

        // Notify admins about new registration
        triggerEvent('admin', 'rider_registered', rider);

        res.status(201).json(rider);
    } catch (error) {
        console.error('Rider registration error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get rider's own profile
// @route   GET /api/riders/my-profile
// @access  Private (Rider role)
const getMyProfile = async (req, res) => {
    try {
        let rider = await Rider.findOne({ user: req.user._id }).populate('user', 'name email phone');

        if (!rider) {
            console.log(`No rider profile for user ID ${req.user._id}. Checking by email ${req.user.email}...`);
            // SMART LINKING: Check if a rider profile exists for this email but different user ID
            const otherRiders = await Rider.find({}).populate('user');
            rider = otherRiders.find(r => r.user && r.user.email.toLowerCase() === req.user.email.toLowerCase());

            if (rider) {
                console.log(`SMART LINKING: Re-linking rider ${rider._id} to new user ID ${req.user._id}`);
                rider.user = req.user._id;
                await rider.save();
                // Re-fetch with population
                rider = await Rider.findById(rider._id).populate('user', 'name email phone');
            } else if (req.user.role === 'rider') {
                // Auto-create if role is rider but profile missing (and no email match)
                rider = await Rider.create({
                    user: req.user._id,
                    fullName: req.user.name,
                    verificationStatus: 'new',
                    isOnline: false
                });
                rider = await Rider.findById(rider._id).populate('user', 'name email phone');
            } else {
                return res.status(404).json({ message: 'Rider profile not found' });
            }
        }

        res.json(rider);
    } catch (error) {
        console.error('Get rider profile error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get rider by ID
// @route   GET /api/riders/:id
// @access  Private
const getRiderById = async (req, res) => {
    try {
        let rider = await Rider.findById(req.params.id).populate('user', 'name email phone');

        // If not found by ID, try finding by user ID
        if (!rider) {
            rider = await Rider.findOne({ user: req.params.id }).populate('user', 'name email phone');
        }

        // If still not found, check if this is a user with rider role
        if (!rider) {
            const user = await User.findOne({ _id: req.params.id, role: 'rider' });
            
            if (user) {
                // Auto-create a basic rider profile if it doesn't exist
                rider = await Rider.create({
                    user: user._id,
                    fullName: user.name,
                    verificationStatus: 'new',
                    status: 'Offline',
                    isOnline: false
                });
                rider = await Rider.findById(rider._id).populate('user', 'name email phone');
            }
        }

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        res.json(rider);
    } catch (error) {
        console.error('Get rider error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update rider documents
// @route   PUT /api/riders/:id/documents
// @access  Private (Rider role)
const updateDocuments = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        // Update documents
        Object.keys(req.body).forEach(key => {
            if (rider.documents[key] !== undefined) {
                rider.documents[key] = normalizePath(req.body[key]);
            }
        });

        await rider.save();
        res.json(rider);
    } catch (error) {
        console.error('Update documents error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Submit rider for verification
// @route   PUT /api/riders/:id/submit-verification
// @access  Private (Rider role)
const submitForVerification = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        // Submission for review
        rider.verificationStatus = 'pending';
        await rider.save();

        res.json(rider);
    } catch (error) {
        console.error('Submit verification error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update rider online/offline status
// @route   PUT /api/riders/:id/status
// @access  Private (Rider role)
const updateStatus = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        rider.isOnline = req.body.isOnline;
        rider.status = req.body.isOnline ? 'Available' : 'Offline';

        await rider.save();
        res.json(rider);
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get available orders for rider
// @route   GET /api/riders/:id/available-orders
// @access  Private
const getAvailableOrders = async (req, res) => {
    try {
        // Get orders that are Accepted, Confirmed, Preparing, Ready or OnTheWay without a rider assigned
        const orders = await Order.find({
            $or: [
                { rider: null, status: 'Accepted' },
                { rider: null, status: 'Confirmed' },
                { rider: null, status: 'Preparing' },
                { rider: null, status: 'Ready' },
                { rider: null, status: 'OnTheWay' }
            ]
        })
            .populate('restaurant', 'name address location')
            .limit(10);

        if (orders.length === 0) {
            return res.json([]);
        }

        // Format the order for the rider
        const formattedOrders = orders.map(order => {
            let distance = order.distanceKm || 0;
            
            // Calculate real distance if we have both locations and distance is 0
            if (distance === 0 && order.restaurant?.location?.coordinates && order.deliveryLocation?.lat) {
                const [restLng, restLat] = order.restaurant.location.coordinates;
                distance = calculateDistance(restLat, restLng, order.deliveryLocation.lat, order.deliveryLocation.lng);
            }
            
            // Fallback if still 0
            if (distance === 0) distance = 4.2;

            const earnings = calculateRiderEarning(distance);
            
            return {
                _id: order._id,
                orderNumber: order.orderNumber || order._id.toString().slice(-4),
                status: order.status,
                rider: order.rider,
                restaurant: {
                    name: order.restaurant?.name || 'Restaurant',
                    address: order.restaurant?.address || 'Restaurant Address',
                    location: order.restaurant?.location
                },
                deliveryAddress: order.shippingAddress?.address || 'Delivery Address',
                distance: distance,
                distanceKm: distance,
                earnings: (order.netRiderEarning && order.netRiderEarning > 0) ? order.netRiderEarning : earnings.netEarning,
                netRiderEarning: (order.netRiderEarning && order.netRiderEarning > 0) ? order.netRiderEarning : earnings.netEarning,
                estimatedTime: Math.round(distance * 3) + 10, // ~3 mins per km + 10 mins prep/wait
                totalAmount: order.totalPrice
            };
        });

        res.json(formattedOrders);
    } catch (error) {
        console.error('Get available orders error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Accept an order
// @route   POST /api/riders/:id/accept-order
// @access  Private
const acceptOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId)
            .populate('restaurant', 'name address')
            .populate('user', 'name phone');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.rider = req.params.id;
        order.riderAcceptedAt = new Date();
        // If order was Ready, we can keep it Ready but with a rider assigned
        // or move it to OnTheWay if that's the desired flow.
        // For now, let's just save the rider assignment.
        await order.save();

        const rider = await Rider.findById(req.params.id).populate('user', 'name phone');
        rider.currentOrder = orderId;
        await rider.save();

        // Get fully populated order to emit
        const updatedOrder = await Order.findById(order._id)
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address contact location')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone' }
            });

        // Trigger Pusher events to notify restaurant and user
        triggerEvent(`restaurant-${order.restaurant._id}`, 'riderAccepted', {
            orderId: order._id,
            riderName: rider.fullName || rider.user?.name,
            riderPhone: rider.user?.phone,
            riderId: rider._id
        });

        triggerEvent(`restaurant-${order.restaurant._id}`, 'orderStatusUpdate', updatedOrder);

        // Create Notification for Rider
        const notification = await createNotification(
            rider.user._id,
            'Order Confirmed',
            `You have accepted order #${order.orderNumber || order._id.toString().slice(-4)}. Pickup from ${order.restaurant?.name}.`,
            'order',
            { orderId: order._id }
        );

        // Emit Real-time Notification
        triggerEvent(`user-${rider.user._id}`, 'notification', notification);

        res.json({ message: 'Order accepted', order: updatedOrder });
    } catch (error) {
        console.error('Accept order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reject an order
// @route   POST /api/riders/:id/reject-order
// @access  Private
const rejectOrder = async (req, res) => {
    try {
        res.json({ message: 'Order rejected' });
    } catch (error) {
        console.error('Reject order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get rider earnings
const getEarnings = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        // Calculate totals from rider model
        const totalEarnings = rider.earnings?.total || 0;
        const completedDeliveries = rider.stats?.completedDeliveries || 0;
        
        // MVP Logic: 60 Base + 20/km
        const BASE_PAY_PER_DELIVERY = 60;
        const totalBasePay = completedDeliveries * BASE_PAY_PER_DELIVERY;
        const totalDistancePay = Math.max(0, totalEarnings - totalBasePay);
        
        const totalTips = 0; // Tips logic to be added later

        // Calculate daily/weekly stats
        const todayEarnings = rider.earnings?.today || 0;
        const weekEarnings = rider.earnings?.thisWeek || 0;

        res.json({
            total: totalEarnings,
            basePay: totalBasePay, 
            distancePay: totalDistancePay,
            bonuses: 0,
            tips: totalTips,
            deliveries: completedDeliveries,
            pendingPayout: rider.walletBalance || 0,
            nextPayoutDate: getNextPayoutDate(),
            today: todayEarnings,
            thisWeek: weekEarnings
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Helper for next payout date (Friday)
const getNextPayoutDate = () => {
    const today = new Date();
    const resultDate = new Date(today.getTime());
    resultDate.setDate(today.getDate() + (7 + 5 - today.getDay()) % 7);
    return resultDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

// @desc    Get rider transactions
// @route   GET /api/riders/:id/transactions
// @access  Private
const getTransactions = async (req, res) => {
    try {
        // Fetch recent transactions from Transaction model
        const transactions = await Transaction.find({
            entityId: req.params.id,
            entityType: 'rider'
        })
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1 })
        .limit(20);

        const formattedTransactions = transactions.map(tx => ({
            id: tx.order ? `#${tx.order.orderNumber}` : tx.reference || 'N/A',
            time: new Date(tx.createdAt).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: 'numeric', 
                hour12: true 
            }),
            amount: tx.amount,
            type: tx.type,
            description: tx.description
        }));

        res.json(formattedTransactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get rider delivery history
// @route   GET /api/riders/:id/deliveries
// @access  Private
const getDeliveryHistory = async (req, res) => {
    try {
        const deliveries = await Order.find({
            rider: req.params.id,
            status: { $in: ['Delivered', 'Completed'] }
        })
            .populate('restaurant', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        const formattedDeliveries = deliveries.map(order => ({
            orderNumber: order.orderNumber,
            restaurant: order.restaurant,
            earnings: order.riderEarning || order.netRiderEarning || 250,
            rating: '5.0',
            timeAgo: getTimeAgo(order.createdAt)
        }));

        res.json(formattedDeliveries);
    } catch (error) {
        console.error('Get delivery history error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getTimeAgo = (date) => {
    if (!date) return 'just now';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'just now';
    const seconds = Math.floor((new Date() - d) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
};

// @desc    Get rider's orders
// @route   GET /api/riders/:id/orders
// @access  Private
const getRiderOrders = async (req, res) => {
    try {
        let riderId = req.params.id;

        // If the ID provided is a User ID, find the associated Rider ID
        const rider = await Rider.findOne({ 
            $or: [
                { _id: riderId },
                { user: riderId }
            ]
        });

        if (rider) {
            riderId = rider._id;
        }

        // Show orders that are Accepted, Confirmed, Preparing, Ready or OnTheWay AND don't have a rider assigned (available for pickup)
        // Plus orders already assigned to this specific rider
        const orders = await Order.find({
            $or: [
                { status: { $in: ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'OnTheWay'] }, rider: null }, // Available ready orders
                { rider: riderId } // Orders assigned to this rider
            ]
        })
            .populate('restaurant', 'name address location')
            .populate('user', 'name phone') // ADD CUSTOMER PHONE
            .sort({ createdAt: -1 })
            .limit(20);

        const formattedOrders = orders.map(order => {
            let distance = order.distanceKm || 0;
            
            // Calculate real distance if we have both locations and distance is 0
            if (distance === 0 && order.restaurant?.location?.coordinates && order.deliveryLocation?.lat) {
                const [restLng, restLat] = order.restaurant.location.coordinates;
                distance = calculateDistance(restLat, restLng, order.deliveryLocation.lat, order.deliveryLocation.lng);
            }
            
            // Fallback if still 0
            if (distance === 0) distance = 4.2;

            const earnings = calculateRiderEarning(distance);
            
            return {
                _id: order._id,
                orderNumber: order.orderNumber || order._id.toString().slice(-4),
                status: order.status,
                restaurant: {
                    name: order.restaurant?.name || 'Restaurant',
                    address: order.restaurant?.address || 'Restaurant Address',
                    location: order.restaurant?.location
                },
                deliveryAddress: order.shippingAddress?.address || 'Delivery Address',
                customer: order.user ? {
                    name: order.user.name,
                    phone: order.user.phone
                } : null,
                timeAgo: getTimeAgo(order.createdAt),
                totalAmount: order.totalPrice,
                rider: order.rider, // Include rider info to check if already assigned
                distance: distance,
                distanceKm: distance,
                earnings: (order.netRiderEarning && order.netRiderEarning > 0) ? order.netRiderEarning : earnings.netEarning,
                netRiderEarning: (order.netRiderEarning && order.netRiderEarning > 0) ? order.netRiderEarning : earnings.netEarning,
                estimatedTime: Math.round(distance * 3) + 10 // ~3 mins per km + 10 mins prep/wait
            };
        });

        res.json(formattedOrders);
    } catch (error) {
        console.error('Get rider orders error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update rider bank details
// @route   PUT /api/riders/:id/bank-details
// @access  Private
const updateBankDetails = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        rider.bankDetails = {
            bankName: req.body.bankName,
            accountNumber: req.body.accountNumber,
            accountTitle: req.body.accountTitle
        };

        await rider.save();
        res.json(rider.bankDetails);
    } catch (error) {
        console.error('Update bank details error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update rider location
// @route   PUT /api/riders/:id/location
// @access  Private
const updateLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        // If there's an active order, update its rider location
        const activeOrder = await Order.findOne({
            rider: req.params.id,
            status: { $in: ['Accepted', 'Preparing', 'Ready', 'OnTheWay', 'Arrived', 'Picked Up', 'ArrivedAtCustomer'] }
        }).populate('user').populate('restaurant');

        if (activeOrder) {
            activeOrder.riderLocation = { lat, lng };
            await activeOrder.save();

            // Trigger Pusher events for real-time tracking
            if (activeOrder.user) {
                triggerEvent(`user-${activeOrder.user._id}`, 'riderLocationUpdate', {
                    orderId: activeOrder._id,
                    location: { lat, lng }
                });
            }

            if (activeOrder.restaurant) {
                triggerEvent(`restaurant-${activeOrder.restaurant._id}`, 'riderLocationUpdate', {
                    orderId: activeOrder._id,
                    location: { lat, lng }
                });
            }
        }

        res.json({ message: 'Location updated' });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Mark order as picked up
// @route   PUT /api/riders/:id/orders/:orderId/pickup
// @access  Private
const markPickedUp = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('user').populate('restaurant');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.pickedUpAt = new Date();
        order.status = 'Picked Up';
        // But we can emit a specific event for pickup
        await order.save();

        // Trigger Pusher events
        if (order.restaurant) {
            triggerEvent(`restaurant-${order.restaurant._id}`, 'riderPickedUp', {
                orderId: order._id,
                status: 'Picked Up',
                pickedUpAt: order.pickedUpAt
            });
        }

        // Notify customer
        if (order.user) {
            triggerEvent(`user-${order.user._id}`, 'orderStatusUpdate', {
                orderId: order._id,
                status: 'Picked Up',
                pickedUpAt: order.pickedUpAt
            });
        }

        res.json(order);
    } catch (error) {
        console.error('Mark picked up error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Process rider cashout
// @route   POST /api/riders/:id/cashout
// @access  Private
const cashout = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        if (!rider.bankDetails || !rider.bankDetails.accountNumber) {
            return res.status(400).json({ message: 'Please add bank details first' });
        }

        const totalAmount = rider.walletBalance || 0;

        if (totalAmount < 500) {
            return res.status(400).json({ message: 'Minimum cashout amount is Rs. 500' });
        }

        // Create payout record
        const payout = await Payout.create({
            rider: rider._id,
            weekStart: new Date(),
            weekEnd: new Date(),
            totalSales: totalAmount,
            netPayable: totalAmount,
            status: 'pending'
        });

        // Update rider wallet balance
        const oldBalance = rider.walletBalance;
        rider.walletBalance = 0;
        await rider.save();

        // Create transaction log
        await Transaction.create({
            entityType: 'rider',
            entityId: rider._id,
            entityModel: 'Rider',
            type: 'payout',
            amount: -totalAmount,
            balanceAfter: 0,
            description: `Cashout request of Rs. ${totalAmount}`,
            reference: payout._id.toString()
        });

        // Emit socket event for admin real-time update
        triggerEvent('admin', 'stats_updated', { 
            type: 'payout_request',
            riderId: rider._id,
            amount: totalAmount 
        });

        res.json({ message: 'Cashout request submitted', payout });
    } catch (error) {
        console.error('Cashout error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update rider profile
// @route   PUT /api/riders/:id/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        if (req.body.city) {
            rider.city = req.body.city;
        }

        // Add other fields here as needed
        if (req.body.vehicleType) {
            rider.vehicleType = req.body.vehicleType;
        }

        await rider.save();
        res.json(rider);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    registerRider,
    getMyProfile,
    getRiderById,
    updateDocuments,
    submitForVerification,
    updateStatus,
    getAvailableOrders,
    acceptOrder,
    rejectOrder,
    getEarnings,
    getTransactions,
    getDeliveryHistory,
    getRiderOrders,
    updateBankDetails,
    updateLocation,
    markPickedUp,
    cashout,
    updateProfile
};
