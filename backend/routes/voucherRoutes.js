const express = require('express');
const router = express.Router();
const { getVouchers, verifyVoucher, createRestaurantVoucher, getRestaurantVouchers, getVouchersByRestaurant, toggleVoucherStatus, getAllVouchersAdmin, createAdminVoucher, updateVoucher, deleteVoucher, getPlatformVouchers } = require('../controllers/voucherController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, getVouchers);
router.get('/platform', getPlatformVouchers);
router.get('/admin/all', protect, requireAdmin, getAllVouchersAdmin);
router.post('/admin', protect, requireAdmin, createAdminVoucher);
router.post('/verify', protect, verifyVoucher);
router.post('/restaurant', protect, createRestaurantVoucher);
router.get('/restaurant/my-vouchers', protect, getRestaurantVouchers);
router.get('/restaurant/:restaurantId', getVouchersByRestaurant);
router.put('/:id/toggle', protect, toggleVoucherStatus);
router.put('/:id', protect, updateVoucher);
router.delete('/:id', protect, deleteVoucher);

module.exports = router;
