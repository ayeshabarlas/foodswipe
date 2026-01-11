const Deal = require('../models/Deal');
const Restaurant = require('../models/Restaurant');
const { triggerEvent } = require('../socket');

/**
 * @desc    Create deal
 * @route   POST /api/deals
 * @access  Private (Restaurant owner)
 */
const createDeal = async (req, res) => {
    try {
        console.log('=== CREATE DEAL DEBUG ===');
        console.log('User:', req.user);
        console.log('User ID:', req.user?._id);

        // Find all restaurants for debugging
        const allRestaurants = await Restaurant.find({}).select('name owner').limit(5);
        console.log('Sample restaurants in DB:', JSON.stringify(allRestaurants, null, 2));

        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        console.log('Found restaurant for this user:', restaurant);

        if (!restaurant) {
            return res.status(404).json({
                message: 'Restaurant not found. Please check backend logs for debugging info.'
            });
        }

        const { title, description, discount, discountType, startDate, endDate, applicableItems, minimumAmount } = req.body;

        const deal = await Deal.create({
            restaurant: restaurant._id,
            title,
            description,
            discount,
            discountType: discountType || 'percentage',
            startDate,
            endDate,
            applicableItems: applicableItems || [],
            minimumAmount: minimumAmount || 0,
            isActive: true,
        });

        // Emit socket event for real-time notification
        triggerEvent('public', 'new_deal', {
            restaurant: restaurant._id,
            restaurantName: restaurant.name,
            deal: deal,
        });

        res.status(201).json(deal);
    } catch (error) {
        console.error('Create deal error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get restaurant's deals
 * @route   GET /api/deals/my-deals
 * @access  Private (Restaurant owner)
 */
const getMyDeals = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const deals = await Deal.find({ restaurant: restaurant._id }).sort({ createdAt: -1 });

        res.json(deals);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get deals by restaurant ID (for customers)
 * @route   GET /api/deals/restaurant/:restaurantId
 * @access  Public
 */
const getDealsByRestaurant = async (req, res) => {
    try {
        const deals = await Deal.find({
            restaurant: req.params.restaurantId,
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
        });

        res.json(deals);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Toggle deal status
 * @route   PUT /api/deals/:id/toggle
 * @access  Private (Restaurant owner)
 */
const toggleDealStatus = async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id);

        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (deal.restaurant.toString() !== restaurant._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        deal.isActive = !deal.isActive;
        await deal.save();

        res.json(deal);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Delete deal
 * @route   DELETE /api/deals/:id
 * @access  Private (Restaurant owner)
 */
const deleteDeal = async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id);

        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (deal.restaurant.toString() !== restaurant._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await deal.deleteOne();
        res.json({ message: 'Deal deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createDeal,
    getMyDeals,
    getDealsByRestaurant,
    toggleDealStatus,
    deleteDeal,
};
