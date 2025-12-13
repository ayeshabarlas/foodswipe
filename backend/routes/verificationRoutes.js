const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const Restaurant = require('../models/Restaurant');
const Rider = require('../models/Rider');

// @desc    Get pending restaurant verifications
// @route   GET /api/verifications/restaurants
// @access  Private/Admin
router.get('/restaurants', protect, requireAdmin, async (req, res) => {
    try {
        const restaurants = await Restaurant.find({
            verificationStatus: { $in: ['pending', 'not_started'] }
        }).populate('owner', 'name email');

        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get pending rider verifications
// @route   GET /api/verifications/riders
// @access  Private/Admin
router.get('/riders', protect, requireAdmin, async (req, res) => {
    try {
        const riders = await Rider.find({
            verificationStatus: 'pending'
        }).populate('user', 'name email');

        res.json(riders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Approve/Reject restaurant
// @route   PUT /api/verifications/restaurants/:id
// @access  Private/Admin
router.put('/restaurants/:id', protect, requireAdmin, async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        console.log(`Verif Route Hit: ID ${req.params.id}, Action: ${action}`);

        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        if (action === 'approve') {
            restaurant.verificationStatus = 'approved';
            restaurant.isVerified = true;
            restaurant.rejectionReason = '';
        } else if (action === 'reject') {
            restaurant.verificationStatus = 'rejected';
            restaurant.isVerified = false;
            restaurant.rejectionReason = rejectionReason || 'Documents not acceptable';
        }

        await restaurant.save();

        // TODO: Send notification to restaurant owner

        res.json({
            message: `Restaurant ${action}ed successfully`,
            restaurant
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Approve/Reject rider
// @route   PUT /api/verifications/riders/:id
// @access  Private/Admin
router.put('/riders/:id', protect, requireAdmin, async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;

        const rider = await Rider.findById(req.params.id);
        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        if (action === 'approve') {
            rider.verificationStatus = 'approved';
        } else if (action === 'reject') {
            rider.verificationStatus = 'rejected';
        }

        await rider.save();

        // TODO: Send notification to rider

        res.json({
            message: `Rider ${action}ed successfully`,
            rider
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
