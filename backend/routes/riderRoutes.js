const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    registerRider,
    getMyProfile,
    getRiderById,
    updateDocuments,
    submitForVerification,
    updateStatus,
    getAvailableOrders,
    acceptOrder,
    rejectOrder,
    getEarnings,
    getTransactions,
    getDeliveryHistory,
    getRiderOrders,
    updateBankDetails,
    updateLocation,
    markPickedUp,
    cashout,
    updateProfile
} = require('../controllers/riderController');

// Register new rider
router.post('/register', protect, registerRider);

// Get rider's own profile
router.get('/my-profile', protect, getMyProfile);

// Update rider profile (City, etc.)
router.put('/:id/profile', protect, updateProfile);

// Get rider by ID
router.get('/:id', protect, getRiderById);

// Update documents
router.put('/:id/documents', protect, updateDocuments);

// Submit for verification
router.put('/:id/submit-verification', protect, submitForVerification);

// Update online/offline status
router.put('/:id/status', protect, updateStatus);

// Get available orders
router.get('/:id/available-orders', protect, getAvailableOrders);

// Accept order
router.post('/:id/accept-order', protect, acceptOrder);

// Reject order
router.post('/:id/reject-order', protect, rejectOrder);

// Get earnings
router.get('/:id/earnings', protect, getEarnings);

// Get transactions
router.get('/:id/transactions', protect, getTransactions);

// Get delivery history
router.get('/:id/deliveries', protect, getDeliveryHistory);

// Get rider orders
router.get('/:id/orders', protect, getRiderOrders);

// Update bank details
router.put('/:id/bank-details', protect, updateBankDetails);

// Update location
router.put('/:id/location', protect, updateLocation);

// Mark order as picked up
router.put('/:id/orders/:orderId/pickup', protect, markPickedUp);

// Cashout
router.post('/:id/cashout', protect, cashout);

module.exports = router;
