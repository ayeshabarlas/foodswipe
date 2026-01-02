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
    getRestaurantSales,
    getDailyStats,
    updateSystemSettings,
    getUsers,
    suspendUser,
    unsuspendUser,
    deleteUser,
    deleteRestaurant,
    deleteRider,
    cleanupMockData
} = require('../controllers/adminController');
const { loginAdmin, getAdminMe, registerAdmin } = require('../controllers/adminAuthController');

// Public routes
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

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

// Rider management
router.get('/riders', getAllRiders);
router.delete('/riders/:id', deleteRider);

// User management
router.get('/users', getUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/unsuspend', unsuspendUser);
router.delete('/users/:id', deleteUser);

// Payments & Commission
router.get('/payments', getRestaurantSales);

// Reports
router.get('/reports/daily', getDailyStats);

// Settings
router.put('/settings', updateSystemSettings);

// Dashboard stats
router.get('/stats', getDashboardStats);

// System Cleanup
router.post('/cleanup-mock', cleanupMockData);

module.exports = router;
