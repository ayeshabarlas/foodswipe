const express = require('express');
const router = express.Router();
const { getRiderBonusStatus, getAllRiderBonusStats } = require('../controllers/bonusController');
const { protect, requireAdmin: admin, requireRider: rider } = require('../middleware/authMiddleware');

// Rider routes
router.get('/status', protect, rider, getRiderBonusStatus);

// Admin routes
router.get('/admin/stats', protect, admin, getAllRiderBonusStats);

module.exports = router;
