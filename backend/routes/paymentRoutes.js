const express = require('express');
const router = express.Router();
const { createSafepaySession, verifySafepayPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/safepay/checkout', protect, createSafepaySession);
router.post('/safepay/verify', verifySafepayPayment);

module.exports = router;
