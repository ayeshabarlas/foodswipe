// Finance Controller - Handles commission calculations, wallet management, and finance overview
const RestaurantWallet = require('../models/RestaurantWallet');
const RiderWallet = require('../models/RiderWallet');
const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { triggerEvent } = require('../socket');
const { calculateRiderEarning } = require('../utils/paymentUtils');

/**
 * Calculate commission amount
 * @param {Number} subtotal - Order subtotal
 * @param {Number} rate - Commission rate (default 10%)
 * @returns {Number} Commission amount
 */
const calculateCommission = (subtotal, rate = 15) => {
    return (subtotal * rate) / 100;
};

/**
 * Split payment between restaurant, rider, and platform
 * @param {Object} order - Order object
 * @returns {Object} Payment split details
 */
const splitPayment = async (order) => {
    const subtotal = order.subtotal || order.totalPrice || 0;
    const deliveryFee = order.deliveryFee || 0;
    const serviceFee = order.serviceFee || 0;
    const tax = order.tax || 0;
    const discount = order.discount || 0;
    
    // Get commission rate from order or fetch from restaurant
    let commissionRate = order.commissionPercent || order.commissionRate;
    
    if (!commissionRate) {
        const restaurant = await Restaurant.findById(order.restaurant);
        commissionRate = restaurant ? (restaurant.commissionRate || (restaurant.businessType === 'home-chef' ? 10 : 15)) : 15;
    }

    const gatewayFee = (order.paymentMethod?.toUpperCase() !== 'COD' && order.paymentMethod?.toUpperCase() !== 'CASH') ? subtotal * 0.025 : 0; // 2.5% gateway fee for online payments

    const commissionAmount = (subtotal * commissionRate) / 100;
    const restaurantEarning = subtotal - commissionAmount;
    
    let riderEarning = deliveryFee;
    if (order.distanceKm) {
        const settings = await require('../models/Settings').getSettings();
        riderEarning = calculateRiderEarning(order.distanceKm, settings).netEarning;
    }

    const platformRevenue = commissionAmount + (deliveryFee - riderEarning) + serviceFee + tax - gatewayFee - discount;

    return {
        subtotal,
        deliveryFee,
        serviceFee,
        tax,
        discount,
        commissionRate,
        commissionAmount,
        restaurantEarning,
        riderEarning,
        platformRevenue,
        gatewayFee,
        totalPrice: subtotal + deliveryFee + serviceFee + tax - discount,
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
        status: { $in: ['Delivered', 'Completed'] },
    });

    // Calculate today's stats
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const todayCommission = todayOrders.reduce((sum, order) => sum + (order.commissionAmount || 0), 0);
    const todayAdminEarning = todayOrders.reduce((sum, order) => sum + (order.adminEarning || 0), 0);
    const todayGatewayFees = todayOrders.reduce((sum, order) => sum + (order.gatewayFee || 0), 0);

    // All-time stats
    const allOrders = await Order.find({ status: { $in: ['Delivered', 'Completed'] } });
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const totalCommission = allOrders.reduce((sum, order) => sum + (order.commissionAmount || 0), 0);
    const totalAdminEarning = allOrders.reduce((sum, order) => sum + (order.adminEarning || 0), 0);
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
            adminEarning: todayAdminEarning,
            gatewayFees: todayGatewayFees,
            platformRevenue: todayAdminEarning - todayGatewayFees,
            orders: todayOrders.length,
        },
        allTime: {
            revenue: totalRevenue,
            commission: totalCommission,
            adminEarning: totalAdminEarning,
            gatewayFees: totalGatewayFees,
            platformRevenue: totalAdminEarning - totalGatewayFees,
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
        const wallets = await RiderWallet.find().populate('rider', 'name email phone stats earnings');
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

        // Emit socket event for admin real-time update
        triggerEvent('admin', 'stats_updated', { 
            type: 'payout_batch_created',
            count: payouts.length 
        });

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

        // 1. Update order status
        const oldStatus = order.status;
        order.status = 'Refunded';
        order.cancellationReason = reason;
        await order.save();

        // 2. If order was already completed/delivered, we might need to deduct from restaurant/rider
        // For now, we mainly record the transaction and update status.
        // If a real wallet deduction is needed, it would happen here:
        if (oldStatus === 'Delivered' || oldStatus === 'Completed') {
            const restaurantWallet = await RestaurantWallet.findOne({ restaurant: order.restaurant });
            if (restaurantWallet && order.restaurantEarning > 0) {
                restaurantWallet.availableBalance = Math.max(0, restaurantWallet.availableBalance - order.restaurantEarning);
                await restaurantWallet.save();

                // Transaction for Restaurant deduction
                await Transaction.create({
                    entityType: 'restaurant',
                    entityId: order.restaurant,
                    entityModel: 'Restaurant',
                    order: orderId,
                    type: 'refund_deduction',
                    amount: order.restaurantEarning,
                    balanceAfter: restaurantWallet.availableBalance,
                    description: `Deduction for refunded order ${orderId}`,
                });

                triggerEvent(`restaurant-${order.restaurant}`, 'wallet_updated', {
                    availableBalance: restaurantWallet.availableBalance
                });
            }
        }

        // 3. Record refund transaction for customer
        const transaction = await Transaction.create({
            entityType: 'customer',
            entityId: order.user,
            entityModel: 'User',
            order: orderId,
            type: 'refund',
            amount: amount || order.totalPrice,
            balanceAfter: 0,
            description: `Refund for order ${orderId}: ${reason}`,
        });

        // 4. Emit socket event for admin real-time update
        triggerEvent('admin', 'stats_updated', { 
            type: 'refund_processed',
            orderId,
            amount: amount || order.totalPrice
        });

        // 5. Notify user
        triggerEvent(`user-${order.user}`, 'orderRefunded', {
            orderId: order._id,
            amount: amount || order.totalPrice,
            reason
        });

        res.json({
            message: 'Refund processed successfully',
            transaction,
            order
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update payout status (mark as paid)
 * @route   PUT /api/finance/payout/:id
 * @access  Private/Admin
 */
const updatePayoutStatus = async (req, res) => {
    try {
        const { status, bankReference, transactionId } = req.body;
        const payout = await Payout.findById(req.params.id);

        if (!payout) {
            return res.status(404).json({ message: 'Payout not found' });
        }

        if (payout.status === 'paid' || payout.status === 'completed') {
            return res.status(400).json({ message: 'Payout already processed' });
        }

        payout.status = status || 'paid';
        if (bankReference) payout.bankReference = bankReference;
        if (transactionId) payout.transactionId = transactionId;
        payout.processedBy = req.user.id;
        payout.processedAt = new Date();

        await payout.save();

        // If marked as paid, deduct from wallet
        if (payout.status === 'paid' || payout.status === 'completed') {
            if (payout.type === 'restaurant') {
                const wallet = await RestaurantWallet.findOne({ restaurant: payout.entityId });
                if (wallet) {
                    wallet.pendingPayout = Math.max(0, wallet.pendingPayout - payout.totalAmount);
                    wallet.availableBalance = Math.max(0, wallet.availableBalance - payout.totalAmount);
                    wallet.lastPayoutDate = new Date();
                    await wallet.save();

                    // Record Transaction
                    await Transaction.create({
                        entityType: 'restaurant',
                        entityId: payout.entityId,
                        entityModel: 'Restaurant',
                        type: 'payout',
                        amount: payout.totalAmount,
                        balanceAfter: wallet.availableBalance,
                        description: `Payout processed: ${payout.bankReference || payout._id}`,
                    });

                    // Socket Update
                    triggerEvent(`restaurant-${payout.entityId}`, 'wallet_updated', {
                        availableBalance: wallet.availableBalance,
                        pendingPayout: wallet.pendingPayout
                    });
                }
            } else if (payout.type === 'rider') {
                const wallet = await RiderWallet.findOne({ rider: payout.entityId });
                if (wallet) {
                    wallet.availableWithdraw = Math.max(0, wallet.availableWithdraw - payout.totalAmount);
                    wallet.lastWithdrawDate = new Date();
                    await wallet.save();

                    // Also update Rider profile balance if it exists there
                    const { Rider: RiderModel } = require('../models/Rider');
                    if (RiderModel) {
                        const rider = await RiderModel.findOne({ user: payout.entityId });
                        if (rider) {
                            rider.earnings_balance = Math.max(0, (rider.earnings_balance || 0) - payout.totalAmount);
                            await rider.save();
                        }
                    }

                    // Record Transaction
                    await Transaction.create({
                        entityType: 'rider',
                        entityId: payout.entityId,
                        entityModel: 'User',
                        type: 'payout',
                        amount: payout.totalAmount,
                        balanceAfter: wallet.availableWithdraw,
                        description: `Payout processed: ${payout.bankReference || payout._id}`,
                    });

                    // Socket Update
                    triggerEvent(`rider-${payout.entityId}`, 'wallet_updated', {
                        availableWithdraw: wallet.availableWithdraw
                    });
                }
            }
        }

        // Emit socket event for admin real-time update
        triggerEvent('admin', 'stats_updated', { 
            type: 'payout_updated',
            payoutId: payout._id,
            status: payout.status
        });

        res.json({
            message: `Payout marked as ${payout.status}`,
            payout,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Settle rider COD cash
 * @route   POST /api/finance/settle-cod
 * @access  Private/Admin
 */
const settleRiderCOD = async (req, res) => {
    try {
        const { riderId, amount, reference, notes } = req.body;

        if (!riderId || !amount) {
            return res.status(400).json({ message: 'Rider ID and amount are required' });
        }

        const wallet = await RiderWallet.findOne({ rider: riderId });

        if (!wallet) {
            return res.status(404).json({ message: 'Rider wallet not found' });
        }

        if (wallet.cashToDeposit < amount) {
            return res.status(400).json({ message: 'Settlement amount exceeds cash to deposit' });
        }

        // Update wallet
        wallet.cashToDeposit -= amount;
        wallet.cashCollected -= amount;
        await wallet.save();

        // Create transaction record
        await Transaction.create({
            entityType: 'rider',
            entityId: riderId,
            entityModel: 'User',
            type: 'cash_deposit',
            amount: -amount, // Negative because it's reducing a "debt" or balance
            balanceAfter: wallet.cashToDeposit,
            description: notes || 'COD Cash Settlement',
            reference: reference || 'Manual Admin Settlement',
        });

        // Emit socket event for rider real-time update
        triggerEvent(`rider_${riderId}`, 'wallet_updated', {
            type: 'cash_settled',
            amount,
            newBalance: wallet.cashToDeposit
        });

        res.json({
            message: 'COD settled successfully',
            cashToDeposit: wallet.cashToDeposit
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
    updatePayoutStatus,
    processRefund,
    settleRiderCOD,
};
