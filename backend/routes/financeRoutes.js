// Finance Routes - Routes for commission, wallets, payouts, and finance overview
const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const {
    getFinanceOverview,
    getRestaurantWallet,
    getRiderWallet,
    getAllRestaurantWallets,
    getAllRiderWallets,
    createPayoutBatch,
    getPayoutHistory,
    processRefund,
} = require('../controllers/financeController');
const { getTransactionHistory } = require('../controllers/walletController');

// All routes require admin authentication
router.use(protect);
router.use(requireAdmin);

// Finance Overview
router.get('/overview', getFinanceOverview);

// Restaurant Wallets
router.get('/restaurant-wallets', getAllRestaurantWallets);
router.get('/restaurant-wallet/:id', getRestaurantWallet);

// Rider Wallets
router.get('/rider-wallets', getAllRiderWallets);
router.get('/rider-wallet/:id', getRiderWallet);

// Transactions
router.get('/transactions/:entityType/:entityId', getTransactionHistory);

// Payouts
router.post('/payout', createPayoutBatch);
router.get('/payouts', getPayoutHistory);

// Refunds
router.post('/refund', processRefund);

module.exports = router;
