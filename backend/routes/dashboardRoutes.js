const express = require('express');
const router = express.Router();
const { getDashboardStats, toggleStoreStatus } = require('../controllers/dashboardController');
const { protect, requireRestaurant } = require('../middleware/authMiddleware');

router.get('/stats', protect, requireRestaurant, getDashboardStats);
router.put('/toggle-status', protect, requireRestaurant, toggleStoreStatus);

module.exports = router;
