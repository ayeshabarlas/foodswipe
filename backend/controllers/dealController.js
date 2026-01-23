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
        let restaurant = await Restaurant.findOne({ owner: req.user._id });

        // Smart linking fallback
        if (!restaurant) {
            const userEmail = req.user.email?.toLowerCase();
            const userPhone = req.user.phone || req.user.phoneNumber;
            const normalizedUserPhone = userPhone ? userPhone.replace(/[\s\-\+\(\)]/g, '').slice(-10) : null;

            if (normalizedUserPhone) {
                restaurant = await Restaurant.findOne({ contact: new RegExp(normalizedUserPhone + '$') });
            }
            if (!restaurant && userEmail) {
                const allRests = await Restaurant.find({}).populate('owner');
                restaurant = allRests.find(r => r.owner?.email?.toLowerCase() === userEmail);
            }
            
            if (restaurant) {
                console.log(`[Deal] Smart-linked restaurant ${restaurant._id} to user ${req.user._id}`);
                restaurant.owner = req.user._id;
                await restaurant.save();
            }
        }

        if (!restaurant) {
            return res.status(404).json({
                message: 'Restaurant not found. Please ensure you have a restaurant profile.'
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
        let restaurant = await Restaurant.findOne({ owner: req.user._id });

        // Smart linking fallback
        if (!restaurant) {
            const userEmail = req.user.email?.toLowerCase();
            const userPhone = req.user.phone || req.user.phoneNumber;
            const normalizedUserPhone = userPhone ? userPhone.replace(/[\s\-\+\(\)]/g, '').slice(-10) : null;

            if (normalizedUserPhone) {
                restaurant = await Restaurant.findOne({ contact: new RegExp(normalizedUserPhone + '$') });
            }
            if (!restaurant && userEmail) {
                const allRests = await Restaurant.find({}).populate('owner');
                restaurant = allRests.find(r => r.owner?.email?.toLowerCase() === userEmail);
            }
            
            if (restaurant) {
                console.log(`[Deal-Get] Smart-linked restaurant ${restaurant._id} to user ${req.user._id}`);
                restaurant.owner = req.user._id;
                await restaurant.save();
            }
        }

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
        // Find deals that are active and either have no date restrictions or are within current date
        const now = new Date();
        const deals = await Deal.find({
            restaurant: req.params.restaurantId,
            isActive: true,
            $or: [
                { 
                    startDate: { $lte: now }, 
                    endDate: { $gte: now } 
                },
                {
                    startDate: { $exists: false },
                    endDate: { $exists: false }
                }
            ]
        }).sort({ createdAt: -1 });

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
