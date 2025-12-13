const Dish = require('../models/Dish');
const Restaurant = require('../models/Restaurant');

// @desc    Search dishes
// @route   GET /api/search/dishes?q=query
// @access  Public
const searchDishes = async (req, res) => {
    try {
        const { q, minPrice, maxPrice, sort } = req.query;

        let query = {};

        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
            ];
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let sortOption = {};
        if (sort === 'price_asc') sortOption.price = 1;
        else if (sort === 'price_desc') sortOption.price = -1;
        else if (sort === 'rating') sortOption.rating = -1;
        else sortOption.createdAt = -1;

        const dishes = await Dish.find(query)
            .populate('restaurant', 'name logo rating')
            .sort(sortOption)
            .limit(50);

        res.json(dishes);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Search restaurants
// @route   GET /api/search/restaurants?q=query
// @access  Public
const searchRestaurants = async (req, res) => {
    try {
        const { q } = req.query;

        let query = { isVerified: true, isActive: true };

        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { address: { $regex: q, $options: 'i' } },
            ];
        }

        const restaurants = await Restaurant.find(query)
            .sort({ rating: -1 })
            .limit(20);

        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get autocomplete suggestions
// @route   GET /api/search/autocomplete?q=query
// @access  Public
const getAutocomplete = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        const [dishes, restaurants] = await Promise.all([
            Dish.find({
                name: { $regex: q, $options: 'i' }
            }).select('name').limit(5),
            Restaurant.find({
                name: { $regex: q, $options: 'i' },
                isVerified: true,
                isActive: true
            }).select('name').limit(5),
        ]);

        const suggestions = [
            ...dishes.map(d => ({ type: 'dish', name: d.name, id: d._id })),
            ...restaurants.map(r => ({ type: 'restaurant', name: r.name, id: r._id })),
        ];

        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    searchDishes,
    searchRestaurants,
    getAutocomplete,
};
