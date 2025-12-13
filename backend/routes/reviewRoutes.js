const express = require('express');
const router = express.Router();
const { createReview, getRestaurantReviews, getDishReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createReview);
router.get('/restaurant/:id', getRestaurantReviews);
router.get('/dish/:id', getDishReviews);

module.exports = router;
