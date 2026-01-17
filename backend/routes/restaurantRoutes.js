const express = require('express');
const router = express.Router();
const {
    createRestaurant,
    getRestaurantById,
    getMyRestaurant,
    updateRestaurant,
    getAllRestaurants,
    getRestaurantAnalytics,
    trackOrderClick,
    getRestaurantReviews,
    updateStoreSettings,
    updatePrepTime,
    submitVerification,
    getWeeklyOrderHistory,
    getRestaurantEarningsStats,
    updateMenuCategories,
} = require('../controllers/restaurantController');
const { protect } = require('../middleware/authMiddleware');

router.get('/debug-all', async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const rests = await Restaurant.find({}).populate('owner', 'email phone phoneNumber');
        res.json(rests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/create', protect, createRestaurant);
router.post('/verify', protect, submitVerification);
router.get('/my-restaurant', protect, getMyRestaurant);
router.get('/earnings/stats', protect, getRestaurantEarningsStats);
router.get('/orders/history/weekly', protect, getWeeklyOrderHistory);
router.put('/store-settings', protect, updateStoreSettings);
router.put('/prep-time', protect, updatePrepTime);
router.put('/categories', protect, updateMenuCategories);
router.get('/:id', getRestaurantById);
router.put('/:id', protect, updateRestaurant);
router.get('/', getAllRestaurants);
router.get('/:id/analytics', protect, getRestaurantAnalytics);
router.post('/:id/track-order-click', trackOrderClick);
router.get('/:id/reviews', getRestaurantReviews);
router.get('/:id/menu', require('../controllers/restaurantController').getRestaurantMenu);

module.exports = router;
