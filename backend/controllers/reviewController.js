const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 * @access  Private
 */
const createReview = async (req, res) => {
    try {
        const { restaurantId, rating, comment, dishId } = req.body;

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Check if user already reviewed this restaurant
        // Optional: Allow multiple reviews or limit one per order? 
        // For now, let's allow multiple but maybe rate limit in future.

        const review = await Review.create({
            user: req.user._id,
            restaurant: restaurantId,
            rating,
            comment,
            dish: dishId || null
        });

        // Update restaurant rating
        const reviews = await Review.find({ restaurant: restaurantId });
        const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

        restaurant.rating = avgRating;
        restaurant.reviewCount = reviews.length;
        await restaurant.save();

        res.status(201).json(review);
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ message: 'Failed to create review', error: error.message });
    }
};

/**
 * @desc    Get reviews for a restaurant
 * @route   GET /api/restaurants/:id/reviews
 * @access  Public
 */
const getRestaurantReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ restaurant: req.params.id })
            .populate('user', 'name avatar')
            .populate('dish', 'name imageUrl')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Failed to get reviews', error: error.message });
    }
};

/**
 * @desc    Get reviews for a dish
 * @route   GET /api/dishes/:id/reviews
 * @access  Public
 */
const getDishReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ dish: req.params.id })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('Get dish reviews error:', error);
        res.status(500).json({ message: 'Failed to get dish reviews', error: error.message });
    }
};

module.exports = {
    createReview,
    getRestaurantReviews,
    getDishReviews
};
