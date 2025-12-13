const Promotion = require('../models/Promotion');
const Restaurant = require('../models/Restaurant');

/**
 * @desc    Get all promotions for a restaurant
 * @route   GET /api/promotions
 * @access  Private
 */
const getPromotions = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const promotions = await Promotion.find({ restaurant: restaurant._id })
            .sort({ createdAt: -1 });

        res.json(promotions);
    } catch (error) {
        console.error('Get promotions error:', error);
        res.status(500).json({ message: 'Failed to get promotions' });
    }
};

/**
 * @desc    Get promotion stats
 * @route   GET /api/promotions/stats
 * @access  Private
 */
const getPromotionStats = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const promotions = await Promotion.find({ restaurant: restaurant._id });

        const activeCount = promotions.filter(p => p.status === 'active').length;
        const totalUses = promotions.reduce((sum, p) => sum + p.uses, 0);
        const totalRevenue = promotions.reduce((sum, p) => sum + p.revenue, 0);

        // Calculate average discount
        const avgDiscount = promotions.length > 0
            ? promotions.reduce((sum, p) => sum + p.value, 0) / promotions.length
            : 0;

        res.json({
            activeCount,
            totalUses,
            totalRevenue,
            avgDiscount: Math.round(avgDiscount),
        });
    } catch (error) {
        console.error('Get promotion stats error:', error);
        res.status(500).json({ message: 'Failed to get stats' });
    }
};

/**
 * @desc    Create promotion
 * @route   POST /api/promotions
 * @access  Private
 */
const createPromotion = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const { name, type, value, code, startDate, endDate, maxUses } = req.body;

        const promotion = await Promotion.create({
            restaurant: restaurant._id,
            name,
            type,
            value,
            code,
            startDate,
            endDate,
            maxUses,
        });

        res.status(201).json(promotion);
    } catch (error) {
        console.error('Create promotion error:', error);
        res.status(500).json({ message: 'Failed to create promotion' });
    }
};

/**
 * @desc    Update promotion
 * @route   PUT /api/promotions/:id
 * @access  Private
 */
const updatePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (promotion.restaurant.toString() !== restaurant._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { name, type, value, code, startDate, endDate, status, maxUses } = req.body;

        if (name) promotion.name = name;
        if (type) promotion.type = type;
        if (value) promotion.value = value;
        if (code) promotion.code = code;
        if (startDate) promotion.startDate = startDate;
        if (endDate) promotion.endDate = endDate;
        if (status) promotion.status = status;
        if (maxUses !== undefined) promotion.maxUses = maxUses;

        await promotion.save();
        res.json(promotion);
    } catch (error) {
        console.error('Update promotion error:', error);
        res.status(500).json({ message: 'Failed to update promotion' });
    }
};

/**
 * @desc    Delete promotion
 * @route   DELETE /api/promotions/:id
 * @access  Private
 */
const deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (promotion.restaurant.toString() !== restaurant._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await promotion.deleteOne();
        res.json({ message: 'Promotion deleted' });
    } catch (error) {
        console.error('Delete promotion error:', error);
        res.status(500).json({ message: 'Failed to delete promotion' });
    }
};

module.exports = {
    getPromotions,
    getPromotionStats,
    createPromotion,
    updatePromotion,
    deletePromotion,
};
