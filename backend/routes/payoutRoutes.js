const express = require('express');
const router = express.Router();
const {
    getCurrentWeekPayout,
    getPayoutHistory,
    uploadPaymentProof,
    getAllPayouts
} = require('../controllers/payoutController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.get('/current', protect, getCurrentWeekPayout);
router.get('/history', protect, getPayoutHistory);
router.get('/all', protect, requireAdmin, getAllPayouts);
router.post('/upload-proof', protect, uploadPaymentProof);

module.exports = router;
