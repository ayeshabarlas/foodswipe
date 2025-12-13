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
} = require('../controllers/restaurantController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createRestaurant);
router.post('/verify', protect, submitVerification);
router.get('/my-restaurant', protect, getMyRestaurant);
router.put('/store-settings', protect, updateStoreSettings);
router.put('/prep-time', protect, updatePrepTime);
router.get('/:id', getRestaurantById);
router.put('/:id', protect, updateRestaurant);
router.get('/', getAllRestaurants);
router.get('/:id/analytics', protect, getRestaurantAnalytics);
router.post('/:id/track-order-click', trackOrderClick);
router.get('/:id/reviews', getRestaurantReviews);
router.get('/:id/menu', require('../controllers/restaurantController').getRestaurantMenu);

module.exports = router;
