const Rider = require('../models/Rider');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const { calculateRiderEarning } = require('../utils/paymentUtils');
const { createNotification } = require('./notificationController');

// @desc    Register a new rider
// @route   POST /api/riders/register
// @access  Private (Rider role)
const registerRider = async (req, res) => {
    try {
        const { fullName, cnicNumber, dateOfBirth, vehicleType } = req.body;

        // Check if rider already exists for this user
        const existingRider = await Rider.findOne({ user: req.user._id });
        if (existingRider) {
            return res.status(400).json({ message: 'Rider profile already exists' });
        }

        // Create new rider
        const rider = await Rider.create({
            user: req.user._id,
            fullName,
            cnicNumber,
            dateOfBirth,
            vehicleType,
            verificationStatus: 'new',
        });

        // Notify admins about new registration
        if (req.app.get('io')) {
            req.app.get('io').to('admin').emit('rider_registered', rider);
        }

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
        const rider = await Rider.findOne({ user: req.user._id }).populate('user', 'name email phone');

        if (!rider) {
            return res.status(404).json({ message: 'Rider profile not found' });
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
            const User = require('../models/User');
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
                rider.documents[key] = req.body[key];
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
        const Order = require('../models/Order');

        // Get orders that are Ready or OnTheWay without a rider assigned
        const orders = await Order.find({
            $or: [
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
            const distance = 3.2; // Calculate real distance later
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
                distance: distance,
                earnings: earnings.netEarning,
                estimatedTime: 15, // Calculate based on distance
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
        const Order = require('../models/Order');
        const { orderId } = req.body;

        const order = await Order.findById(orderId)
            .populate('restaurant', 'name address')
            .populate('user', 'name phone');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.rider = req.params.id;
        order.riderAcceptedAt = new Date();
        await order.save();

        const rider = await Rider.findById(req.params.id).populate('user', 'name phone');
        rider.currentOrder = orderId;
        await rider.save();

        // Emit socket event to notify restaurant that rider accepted
        if (req.app && req.app.get('io')) {
            req.app.get('io').to(`restaurant_${order.restaurant._id}`).emit('riderAccepted', {
                orderId: order._id,
                riderName: rider.user?.name || rider.fullName,
                riderPhone: rider.user?.phone
            });
        }

        // Create Notification for Rider
        const notification = await createNotification(
            rider.user._id,
            'Order Confirmed',
            `You have accepted order #${order.orderNumber || order._id.toString().slice(-4)}. Pickup from ${order.restaurant?.name}.`,
            'order',
            { orderId: order._id }
        );

        // Emit Real-time Notification
        if (req.app && req.app.get('io')) {
            req.app.get('io').to(`user_${rider.user._id}`).emit('notification', notification);
        }

        res.json({ message: 'Order accepted', order });
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
// @route   GET /api/riders/:id/earnings
// @access  Private
const getEarnings = async (req, res) => {
    try {
        const rider = await Rider.findById(req.params.id);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        // Calculate totals from rider model (already updated on order completion)
        const totalEarnings = rider.earnings?.total || 0;
        const totalTips = 0; // Tips logic to be added later

        // Calculate daily/weekly stats
        const todayEarnings = rider.earnings?.today || 0;
        const weekEarnings = rider.earnings?.thisWeek || 0;

        res.json({
            total: weekEarnings,
            basePay: totalEarnings, 
            bonuses: 0,
            tips: totalTips,
            deliveries: rider.totalOrders || 0,
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
        const Order = require('../models/Order');

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
            earnings: 250,
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
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

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
        const Order = require('../models/Order');
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

        // Show ALL orders that are Ready or OnTheWay (available for pickup)
        // Plus orders already assigned to this specific rider
        const orders = await Order.find({
            $or: [
                { status: { $in: ['Ready', 'OnTheWay'] } }, // All ready orders
                { rider: riderId } // Orders assigned to this rider
            ]
        })
            .populate('restaurant', 'name address location')
            .populate('user', 'name phone') // ADD CUSTOMER PHONE
            .sort({ createdAt: -1 })
            .limit(20);

        const formattedOrders = orders.map(order => {
            // Use real distance or default to 4.8km for display if missing
            const distance = order.distanceKm || 4.8;
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
                distanceKm: distance,
                netRiderEarning: order.netRiderEarning || earnings.netEarning
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
        const { lat, lng, orderId } = req.body;
        const io = req.app.get('io');

        // If there's an active order, update its rider location
        if (orderId) {
            const Order = require('../models/Order');
            const order = await Order.findById(orderId).populate('user').populate('restaurant');

            if (order) {
                order.riderLocation = { lat, lng };
                await order.save();

                // Emit to customer and restaurant rooms
                if (order.user) {
                    io.to(`user_${order.user._id}`).emit('riderLocationUpdate', {
                        orderId,
                        location: { lat, lng }
                    });
                }

                if (order.restaurant) {
                    io.to(`restaurant_${order.restaurant._id}`).emit('riderLocationUpdate', {
                        orderId,
                        location: { lat, lng }
                    });
                }
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
        const Order = require('../models/Order');
        const order = await Order.findById(req.params.orderId).populate('user').populate('restaurant');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.pickedUpAt = new Date();
        // Don't change status to OnTheWay here as it's already OnTheWay when handed to rider
        // But we can emit a specific event for pickup
        await order.save();

        const io = req.app.get('io');

        // Notify restaurant
        if (order.restaurant) {
            io.to(`restaurant_${order.restaurant._id}`).emit('riderPickedUp', {
                orderId: order._id,
                pickedUpAt: order.pickedUpAt
            });
        }

        // Notify customer
        if (order.user) {
            io.to(`user_${order.user._id}`).emit('orderStatusUpdate', {
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
        const Payout = require('../models/Payout');
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
