const express = require('express');
const router = express.Router();
const {
    getPromotions,
    getPromotionStats,
    createPromotion,
    updatePromotion,
    deletePromotion,
} = require('../controllers/promotionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getPromotions);
router.get('/stats', protect, getPromotionStats);
router.post('/', protect, createPromotion);
router.put('/:id', protect, updatePromotion);
router.delete('/:id', protect, deletePromotion);

module.exports = router;
