const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const {
    getPendingRestaurants,
    approveRestaurant,
    rejectRestaurant,
    getAllOrders,
    getDashboardStats,
    getQuickStats,
    getFinanceStats,
    getAllRestaurants,
    getAllRiders,
    approveRider,
    rejectRider,
    resetRider,
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
    blockRider,
    getNotificationCounts,
    getAdminNotifications,
    markNotificationRead,
    nuclearWipe,
    fixInflatedOrders,
    assignRiderToOrder,
    getActionHistory
} = require('../controllers/adminController');
const { loginAdmin, getAdminMe, registerAdmin, inviteAdmin, acceptInvite, getAllAdmins, deleteAdmin, debugAdminStatus } = require('../controllers/adminAuthController');

// Public routes
router.get('/debug-status', debugAdminStatus);
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.post('/accept-invite', acceptInvite);

// System Cleanup & Fixes
router.get('/fix-inflated-orders', fixInflatedOrders);
router.get('/nuclear-wipe', nuclearWipe);

// Admin Info & Management
router.get('/me', protect, requireAdmin, getAdminMe);
router.get('/list', protect, requireAdmin, getAllAdmins);
router.post('/invite', protect, requireAdmin, inviteAdmin);
router.delete('/:id', protect, requireAdmin, deleteAdmin);

// All other routes require admin authentication
router.use(protect);
router.use(requireAdmin);

// Restaurant management
router.get('/restaurants/pending', getPendingRestaurants);
router.get('/restaurants', getAllRestaurants);
router.put('/restaurants/:id/approve', approveRestaurant);
router.put('/restaurants/:id/reject', rejectRestaurant);
router.delete('/restaurants/:id', deleteRestaurant);

// Order management
router.get('/orders', getAllOrders);
router.post('/orders/:id/assign-rider', assignRiderToOrder);

// Rider management
router.get('/riders', getAllRiders);
router.put('/riders/:id/approve', approveRider);
router.put('/riders/:id/reject', rejectRider);
router.put('/riders/:id/reset', resetRider);
router.delete('/riders/:id', deleteRider);

// User management
router.get('/users', getUsers);
router.post('/users/sync', syncFirebaseUsers);
router.get('/users/verify', verifyUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/unsuspend', unsuspendUser);
router.delete('/users/:id', deleteUser);
router.get('/history', getActionHistory);

// Payments & Commission
router.get('/payments', getRestaurantSales);

// Reports
router.get('/reports/daily', getDailyStats);

// Settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Dashboard stats
router.get('/stats', getDashboardStats);
router.get('/stats/quick', getQuickStats);
router.get('/stats/finance', getFinanceStats);
router.get('/notifications/counts', getNotificationCounts);
router.get('/notifications', getAdminNotifications);
router.put('/notifications/:id/read', markNotificationRead);

// System Cleanup
router.post('/cleanup-mock', cleanupMockData);

// COD Ledger & Settlement
router.get('/cod-ledger', getCODLedger);
router.post('/settle-rider', settleRider);
router.post('/riders/:id/block', blockRider);

module.exports = router;
