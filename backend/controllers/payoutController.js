const Payout = require('../models/Payout');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');
const { triggerEvent } = require('../socket');

// Helper to get restaurant product IDs
const getRestaurantProductIds = async (restaurantId) => {
    const dishes = await Dish.find({ restaurant: restaurantId });
    return dishes.map(dish => dish._id);
};

// Helper to get current week's start and end dates
const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

// Helper function to calculate totals
const calculateTotals = async (restaurantId, start, end) => {
    const restaurant = await Restaurant.findById(restaurantId);
    
    const orders = await Order.find({
        restaurant: restaurantId,
        status: { $in: ['Delivered', 'Completed'] },
        createdAt: { $gte: start, $lte: end }
    });

    let totalSales = 0;
    let totalCommission = 0;
    let netPayable = 0;

    orders.forEach(order => {
        // Use stored finance split if available, otherwise fallback to default calculation
        const subtotal = order.subtotal || order.totalPrice || 0;
        
        // Fallback calculation if detailed fields are missing
        const fallbackCommRate = (restaurant && restaurant.businessType === 'home-chef') ? 10 : 15;
        const commAmt = order.commissionAmount !== undefined ? order.commissionAmount : (subtotal * (order.commissionPercent || fallbackCommRate) / 100);
        const restEarn = order.restaurantEarning !== undefined ? order.restaurantEarning : (subtotal - commAmt);

        totalSales += subtotal;
        totalCommission += commAmt;
        netPayable += restEarn;
    });

    return { totalSales, totalCommission, netPayable };
};

/**
 * @desc    Get current week's payout details
 * @route   GET /api/payouts/current
 * @access  Private (Restaurant Owner)
 */
const getCurrentWeekPayout = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const { start, end } = getCurrentWeekRange();

        // Check if a payout record already exists for this week
        let payout = await Payout.findOne({
            restaurant: restaurant._id,
            weekStart: { $gte: start, $lte: end }
        });

        if (!payout) {
            const totals = await calculateTotals(restaurant._id, start, end);
            payout = new Payout({
                type: 'restaurant',
                entityId: restaurant._id,
                entityModel: 'Restaurant',
                restaurant: restaurant._id,
                weekStart: start,
                weekEnd: end,
                totalSales: totals.totalSales,
                totalCommission: totals.totalCommission,
                netPayable: totals.netPayable,
                totalAmount: totals.netPayable,
                status: 'pending'
            });
        } else if (payout.status === 'pending') {
            // Update totals dynamically if still pending
            const totals = await calculateTotals(restaurant._id, start, end);
            payout.totalSales = totals.totalSales;
            payout.totalCommission = totals.totalCommission;
            payout.netPayable = totals.netPayable;
            payout.totalAmount = totals.netPayable;
        }

        res.json(payout);
    } catch (error) {
        console.error('Get current payout error:', error);
        res.status(500).json({ message: 'Failed to get payout details' });
    }
};

/**
 * @desc    Get payout history
 * @route   GET /api/payouts/history
 * @access  Private (Restaurant Owner)
 */
const getPayoutHistory = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const payouts = await Payout.find({ restaurant: restaurant._id })
            .sort({ weekStart: -1 });

        res.json(payouts);
    } catch (error) {
        console.error('Get payout history error:', error);
        res.status(500).json({ message: 'Failed to get payout history' });
    }
};

/**
 * @desc    Upload payment proof
 * @route   POST /api/payouts/upload-proof
 * @access  Private (Restaurant Owner)
 */
const uploadPaymentProof = async (req, res) => {
    try {
        const { payoutId, transactionId, proofUrl } = req.body;

        // If no payoutId (e.g. current week), we might need to create one or find it
        let payout;
        if (payoutId) {
            payout = await Payout.findById(payoutId);
        } else {
            // Find current week's payout or create it
            const restaurant = await Restaurant.findOne({ owner: req.user._id });
            const { start, end } = getCurrentWeekRange();
            payout = await Payout.findOne({
                restaurant: restaurant._id,
                weekStart: { $gte: start, $lte: end }
            });

            if (!payout) {
                const totals = await calculateTotals(restaurant._id, start, end);
                payout = new Payout({
                    type: 'restaurant',
                    entityId: restaurant._id,
                    entityModel: 'Restaurant',
                    restaurant: restaurant._id,
                    weekStart: start,
                    weekEnd: end,
                    totalSales: totals.totalSales,
                    totalCommission: totals.totalCommission,
                    netPayable: totals.netPayable,
                    totalAmount: totals.netPayable,
                    status: 'pending'
                });
            }
        }

        if (!payout) {
            return res.status(404).json({ message: 'Payout record not found' });
        }

        payout.transactionId = transactionId;
        payout.proofUrl = proofUrl;
        payout.status = 'paid'; // Mark as paid by restaurant, pending verification
        payout.processedAt = new Date();

        await payout.save();

        // Emit socket event for admin (if we had admin room)
        // req.app.get('io').to('admin_room').emit('new_payment_proof', payout);

        // Emit back to restaurant to confirm update
        triggerEvent(`restaurant_${payout.restaurant}`, 'payment_status_updated', {
            payoutId: payout._id,
            status: 'paid'
        });

        res.json({ message: 'Payment proof uploaded successfully', payout });
    } catch (error) {
        console.error('Upload proof error:', error);
        res.status(500).json({ message: 'Failed to upload proof' });
    }
};

/**
 * @desc    Get all payouts (Admin)
 * @route   GET /api/payouts/all
 * @access  Private/Admin
 */
const getAllPayouts = async (req, res) => {
    try {
        const payouts = await Payout.find({})
            .populate({
                path: 'restaurant',
                select: 'name email phone'
            })
            .populate({
                path: 'rider',
                select: 'name email phone'
            })
            .sort({ createdAt: -1 });

        // Enrich data if needed
        const enrichedPayouts = payouts.map(p => ({
            ...p.toObject(),
            // Assuming simplified view for now
            entityName: p.type === 'restaurant' ? p.restaurant?.name : p.rider?.name || 'Unknown'
        }));

        res.json(enrichedPayouts);
    } catch (error) {
        console.error('Get all payouts error:', error);
        res.status(500).json({ message: 'Failed to fetch payouts' });
    }
};

module.exports = {
    getCurrentWeekPayout,
    getPayoutHistory,
    uploadPaymentProof,
    getAllPayouts
};
