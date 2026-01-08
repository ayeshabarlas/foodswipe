const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrderById,
    updateOrderStatus,
    getUserOrders,
    getActiveUserOrders,
    getRestaurantOrders,
    cancelOrder,
    completeOrder,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createOrder);
router.route('/my-orders').get(protect, getUserOrders);
router.route('/user/active').get(protect, getActiveUserOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/status').put(protect, updateOrderStatus);
router.route('/:id/complete').post(protect, completeOrder);
router.route('/:id/cancel').patch(protect, cancelOrder);
router.route('/restaurant/:restaurantId').get(protect, getRestaurantOrders);

module.exports = router;
