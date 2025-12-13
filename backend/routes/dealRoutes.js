const express = require('express');
const router = express.Router();
const {
    createDeal,
    getMyDeals,
    getDealsByRestaurant,
    toggleDealStatus,
    deleteDeal,
} = require('../controllers/dealController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createDeal);
router.get('/my-deals', protect, getMyDeals);
router.get('/restaurant/:restaurantId', getDealsByRestaurant);
router.put('/:id/toggle', protect, toggleDealStatus);
router.delete('/:id', protect, deleteDeal);

module.exports = router;
