// Finance Controller - Handles commission calculations, wallet management, and finance overview
const RestaurantWallet = require('../models/RestaurantWallet');
const RiderWallet = require('../models/RiderWallet');
const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

/**
 * Calculate commission amount
 * @param {Number} subtotal - Order subtotal
 * @param {Number} rate - Commission rate (default 10%)
 * @returns {Number} Commission amount
 */
const calculateCommission = (subtotal, rate = 10) => {
    return (subtotal * rate) / 100;
};

/**
 * Split payment between restaurant, rider, and platform
 * @param {Object} order - Order object
 * @returns {Object} Payment split details
 */
const splitPayment = async (order) => {
    const subtotal = order.subtotal || 0;
    const deliveryFee = order.deliveryFee || 0;
    const discount = order.discount || 0;
    const commissionRate = order.commissionRate || 10;
    const gatewayFee = order.paymentMethod !== 'COD' ? subtotal * 0.025 : 0; // 2.5% gateway fee for online payments

    const commissionAmount = calculateCommission(subtotal, commissionRate);
    const restaurantEarning = subtotal - commissionAmount;
    const riderEarning = deliveryFee;
    const platformRevenue = commissionAmount - gatewayFee;

    return {
        subtotal,
        deliveryFee,
        discount,
        commissionRate,
        commissionAmount,
        restaurantEarning,
        riderEarning,
        platformRevenue,
        gatewayFee,
        totalPrice: subtotal + deliveryFee - discount,
    };
};

/**
 * @desc    Get finance overview dashboard
 * @route   GET /api/finance/overview
 * @access  Private/Admin
 */
const getFinanceOverview = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Today's orders
        const todayOrders = await Order.find({
            createdAt: { $gte: today },
            status: { $ne: 'Cancelled' },
        });

        // Calculate today's stats
        const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const todayCommission = todayOrders.reduce((sum, order) => sum + (order.commissionAmount || 0), 0);
        const todayGatewayFees = todayOrders.reduce((sum, order) => sum + (order.gatewayFee || 0), 0);

        // All-time stats
        const allOrders = await Order.find({ status: { $ne: 'Cancelled' } });
        const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const totalCommission = allOrders.reduce((sum, order) => sum + (order.commissionAmount || 0), 0);
        const totalGatewayFees = allOrders.reduce((sum, order) => sum + (order.gatewayFee || 0), 0);

        // Pending payouts
        const restaurantWallets = await RestaurantWallet.find();
        const riderWallets = await RiderWallet.find();

        const pendingRestaurantPayouts = restaurantWallets.reduce((sum, wallet) => sum + wallet.pendingPayout, 0);
        const pendingRiderPayouts = riderWallets.reduce((sum, wallet) => sum + wallet.availableWithdraw, 0);

        res.json({
            today: {
                revenue: todayRevenue,
                commission: todayCommission,
                gatewayFees: todayGatewayFees,
                platformRevenue: todayCommission - todayGatewayFees,
                orders: todayOrders.length,
            },
            allTime: {
                revenue: totalRevenue,
                commission: totalCommission,
                gatewayFees: totalGatewayFees,
                platformRevenue: totalCommission - totalGatewayFees,
                orders: allOrders.length,
            },
            pendingPayouts: {
                restaurants: pendingRestaurantPayouts,
                riders: pendingRiderPayouts,
                total: pendingRestaurantPayouts + pendingRiderPayouts,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get restaurant wallet details
 * @route   GET /api/finance/restaurant-wallet/:id
 * @access  Private/Admin
 */
const getRestaurantWallet = async (req, res) => {
    try {
        let wallet = await RestaurantWallet.findOne({ restaurant: req.params.id }).populate('restaurant', 'name email');

        if (!wallet) {
            // Create wallet if it doesn't exist
            wallet = await RestaurantWallet.create({
                restaurant: req.params.id,
            });
            wallet = await wallet.populate('restaurant', 'name email');
        }

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get rider wallet details
 * @route   GET /api/finance/rider-wallet/:id
 * @access  Private/Admin
 */
const getRiderWallet = async (req, res) => {
    try {
        let wallet = await RiderWallet.findOne({ rider: req.params.id }).populate('rider', 'name email');

        if (!wallet) {
            // Create wallet if it doesn't exist
            wallet = await RiderWallet.create({
                rider: req.params.id,
            });
            wallet = await wallet.populate('rider', 'name email');
        }

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all restaurant wallets
 * @route   GET /api/finance/restaurant-wallets
 * @access  Private/Admin
 */
const getAllRestaurantWallets = async (req, res) => {
    try {
        const wallets = await RestaurantWallet.find().populate('restaurant', 'name email phone');
        res.json(wallets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all rider wallets
 * @route   GET /api/finance/rider-wallets
 * @access  Private/Admin
 */
const getAllRiderWallets = async (req, res) => {
    try {
        const wallets = await RiderWallet.find().populate('rider', 'name email phone');
        res.json(wallets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Create payout batch
 * @route   POST /api/finance/payout
 * @access  Private/Admin
 */
const createPayoutBatch = async (req, res) => {
    try {
        const { type, entityIds, bankReference, notes } = req.body;

        if (!type || !entityIds || entityIds.length === 0) {
            return res.status(400).json({ message: 'Type and entity IDs are required' });
        }

        const payouts = [];

        for (const entityId of entityIds) {
            let wallet, entityModel, amount;

            if (type === 'restaurant') {
                wallet = await RestaurantWallet.findOne({ restaurant: entityId });
                entityModel = 'Restaurant';
                amount = wallet?.pendingPayout || 0;
            } else if (type === 'rider') {
                wallet = await RiderWallet.findOne({ rider: entityId });
                entityModel = 'User';
                amount = wallet?.availableWithdraw || 0;
            }

            if (amount > 0) {
                const payout = await Payout.create({
                    type,
                    entityId,
                    entityModel,
                    totalAmount: amount,
                    bankReference,
                    notes,
                    processedBy: req.user.id,
                    status: 'pending',
                });

                payouts.push(payout);
            }
        }

        res.status(201).json({
            message: `Created ${payouts.length} payout(s)`,
            payouts,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get payout history
 * @route   GET /api/finance/payouts
 * @access  Private/Admin
 */
const getPayoutHistory = async (req, res) => {
    try {
        const { type, status } = req.query;
        const filter = {};

        if (type) filter.type = type;
        if (status) filter.status = status;

        const payouts = await Payout.find(filter)
            .populate('entityId')
            .populate('processedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(payouts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Process refund
 * @route   POST /api/finance/refund
 * @access  Private/Admin
 */
const processRefund = async (req, res) => {
    try {
        const { orderId, amount, reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Record refund transaction
        const transaction = await Transaction.create({
            entityType: 'customer',
            entityId: order.user,
            entityModel: 'User',
            order: orderId,
            type: 'refund',
            amount: amount,
            balanceAfter: 0,
            description: `Refund for order ${orderId}: ${reason}`,
        });

        res.json({
            message: 'Refund processed successfully',
            transaction,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    calculateCommission,
    splitPayment,
    getFinanceOverview,
    getRestaurantWallet,
    getRiderWallet,
    getAllRestaurantWallets,
    getAllRiderWallets,
    createPayoutBatch,
    getPayoutHistory,
    processRefund,
};
