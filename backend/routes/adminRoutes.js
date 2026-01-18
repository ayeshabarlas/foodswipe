const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const {
    getPendingRestaurants,
    approveRestaurant,
    rejectRestaurant,
    getAllOrders,
    getDashboardStats,
    getAllRestaurants,
    getAllRiders,
    approveRider,
    rejectRider,
    getRestaurantSales,
    getDailyStats,
    getSystemSettings,
    updateSystemSettings,
    getUsers,
    syncFirebaseUsers,
    verifyUsers,
    suspendUser,
    unsuspendUser,
    deleteUser,
    deleteRestaurant,
    deleteRider,
    cleanupMockData,
    getCODLedger,
    settleRider,
    blockRider
} = require('../controllers/adminController');
const { loginAdmin, getAdminMe, registerAdmin, inviteAdmin, acceptInvite, getAllAdmins, deleteAdmin } = require('../controllers/adminAuthController');

// Public routes
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.post('/accept-invite', acceptInvite);

// All other routes require admin authentication
router.use(protect);
router.use(requireAdmin);

// Admin Info & Management
router.get('/me', getAdminMe);
router.get('/list', getAllAdmins);
router.post('/invite', inviteAdmin);
router.delete('/:id', deleteAdmin);

// Restaurant management
router.get('/restaurants/pending', getPendingRestaurants);
router.get('/restaurants', getAllRestaurants);
router.put('/restaurants/:id/approve', approveRestaurant);
router.put('/restaurants/:id/reject', rejectRestaurant);
router.delete('/restaurants/:id', deleteRestaurant);

// Order management
router.get('/orders', getAllOrders);

// Rider management
router.get('/riders', getAllRiders);
router.put('/riders/:id/approve', approveRider);
router.put('/riders/:id/reject', rejectRider);
router.delete('/riders/:id', deleteRider);

// User management
router.get('/users', getUsers);
router.post('/users/sync', syncFirebaseUsers);
router.get('/users/verify', verifyUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/unsuspend', unsuspendUser);
router.delete('/users/:id', deleteUser);

// Payments & Commission
router.get('/payments', getRestaurantSales);

// Reports
router.get('/reports/daily', getDailyStats);

// Settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Dashboard stats
router.get('/stats', getDashboardStats);

// System Cleanup
router.post('/cleanup-mock', cleanupMockData);

// COD Ledger & Settlement
router.get('/cod-ledger', getCODLedger);
router.post('/settle-rider', settleRider);
router.post('/riders/:id/block', blockRider);

module.exports = router;
