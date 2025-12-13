// backend/routes/payment.js
const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, codOrder, payoutRider } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Create a payment order (card/bank/digital)
router.post('/create-order', protect, createOrder);

// Verify payment after redirect or Stripe webhook
router.post('/verify', protect, verifyPayment);

// Cash on Delivery endpoint
router.post('/cod', protect, codOrder);

// Rider payout after delivery
router.post('/payout', protect, payoutRider);

module.exports = router;
