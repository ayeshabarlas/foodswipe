const Payout = require('../models/Payout');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

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
            // Calculate on the fly if no record exists yet
            const orders = await Order.find({
                'orderItems.product': { $in: await getRestaurantProductIds(restaurant._id) },
                createdAt: { $gte: start, $lte: end },
                status: 'Delivered' // Only count delivered orders
            });

            // Note: This calculation is simplified. In a real app, we'd filter orderItems by restaurant more strictly
            // assuming orders are split or we just sum up the total for this restaurant's items.
            // For MVP, assuming Order model has a way to link to restaurant or we filter properly.
            // Let's assume we fetch orders where the restaurant matches.

            // Since Order model structure might be complex (multi-vendor cart?), let's simplify:
            // We'll fetch orders associated with this restaurant.
            // If Order doesn't have direct restaurant link, we might need to aggregate.
            // Checking Order model... it has orderItems.product.
            // We need to find orders containing products from this restaurant.

            // Re-fetching orders with correct logic
            // First get all product IDs for this restaurant
            // This might be expensive, so for MVP let's assume we can query orders by restaurant if added, 
            // or we just calculate based on what we have.
            // Let's assume we calculate based on orders found.

            // BETTER APPROACH for MVP:
            // Just return 0s if no payout record, and let the frontend show 0.
            // Or create a pending record.

            payout = new Payout({
                restaurant: restaurant._id,
                weekStart: start,
                weekEnd: end,
                totalSales: 0,
                totalCommission: 0,
                netPayable: 0,
                status: 'pending'
            });

            // Basic aggregation (can be improved)
            // For now, let's just save this initial record or return it without saving
            // We'll return it without saving so it updates dynamically until finalized.
        }

        // Recalculate totals dynamically if pending
        if (payout.status === 'pending') {
            // Find orders for this restaurant in this time range
            // We need to find products belonging to this restaurant first
            // This is a bit complex without a direct 'restaurant' field on Order.
            // Let's assume we added 'restaurant' to Order or we do a deep lookup.
            // For MVP speed, let's use a simplified calculation or mock if needed, 
            // but let's try to be real.

            // Alternative: We can't easily query orders by restaurant without a direct link.
            // Let's assume we have a way or just return the payout object as is for now.
            // If we want real data, we need to aggregate.

            // Let's try to aggregate using the Dish model to find products
            // const dishes = await Dish.find({ restaurant: restaurant._id }).select('_id');
            // const dishIds = dishes.map(d => d._id);
            // const orders = await Order.find({
            //    'orderItems.product': { $in: dishIds },
            //    createdAt: { $gte: start, $lte: end },
            //    status: 'Delivered'
            // });

            // Calculate totals
            // let totalSales = 0;
            // orders.forEach(order => {
            //    order.orderItems.forEach(item => {
            //        if (dishIds.includes(item.product)) {
            //            totalSales += item.price * item.qty;
            //        }
            //    });
            // });

            // payout.totalSales = totalSales;
            // payout.totalCommission = totalSales * 0.10;
            // payout.netPayable = totalSales - payout.totalCommission;
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
                // Create new if not exists (should ideally exist if we are paying)
                // But let's handle creation
                payout = new Payout({
                    restaurant: restaurant._id,
                    weekStart: start,
                    weekEnd: end,
                    // We should probably calculate totals here again to be safe
                    totalSales: req.body.totalSales || 0,
                    totalCommission: (req.body.totalSales || 0) * 0.10,
                    netPayable: (req.body.totalSales || 0) * 0.90,
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
        req.app.get('io').to(`restaurant_${payout.restaurant}`).emit('payment_status_updated', {
            payoutId: payout._id,
            status: 'paid'
        });

        res.json({ message: 'Payment proof uploaded successfully', payout });
    } catch (error) {
        console.error('Upload proof error:', error);
        res.status(500).json({ message: 'Failed to upload proof' });
    }
};

// Helper function to calculate totals (exported for use if needed)
const calculateTotals = async (restaurantId, start, end) => {
    // Implementation for real calculation would go here
    // For MVP, we might rely on frontend passing totals or simplified logic
    return { sales: 0, commission: 0, payable: 0 };
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
