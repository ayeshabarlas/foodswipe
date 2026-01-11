const express = require('express');
const router = express.Router();
const Dish = require('../models/Dish');
const { protect, requireRestaurant } = require('../middleware/authMiddleware');
const { checkRestaurantApproval } = require('../middleware/approvalMiddleware');

/**
 * Normalizes image/video paths to store only the relative path
 * (e.g., from "http://localhost:5000/uploads/file.jpg" to "/uploads/file.jpg")
 */
const normalizePath = (path) => {
    if (!path) return '';
    // If it's a full URL, extract the path part starting from /uploads/
    if (path.includes('/uploads/')) {
        const index = path.indexOf('/uploads/');
        return path.substring(index);
    }
    return path;
};

// @desc    Get all dishes for a restaurant
// @route   GET /api/dishes/restaurant/:restaurantId
// @access  Public
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const dishes = await Dish.find({ restaurant: req.params.restaurantId });
        res.json(dishes);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Get all dishes for logged-in restaurant owner  
// @route   GET /api/dishes/my-dishes
// @access  Private (Restaurant only)
router.get('/my-dishes', protect, requireRestaurant, async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const dishes = await Dish.find({ restaurant: restaurant._id });
        res.json(dishes);
    } catch (error) {
        console.error('Error fetching my dishes:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Create a new dish
// @route   POST /api/dishes
// @access  Private (Restaurant only)
router.post('/', protect, requireRestaurant, checkRestaurantApproval, async (req, res) => {
    try {
        console.log('=== CREATE DISH DEBUG ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const {
            name, description, price, videoUrl, imageUrl, category, restaurant,
            ingredients, stockQuantity, lowStockThreshold,
            variants, addOns, drinks, combos, recommendedItems, customizations
        } = req.body;

        // Validation - only name, price, image, and restaurant are required
        if (!name || !price || !imageUrl || !restaurant) {
            console.log('Validation failed - missing fields:', {
                hasName: !!name,
                hasPrice: !!price,
                hasImage: !!imageUrl,
                hasRestaurant: !!restaurant
            });
            return res.status(400).json({
                message: 'Missing required fields: name, price, image, restaurant'
            });
        }

        const dish = await Dish.create({
            name,
            description: description || '',
            price,
            videoUrl: normalizePath(videoUrl),
            imageUrl: normalizePath(imageUrl),
            category,
            restaurant,
            ingredients: ingredients || [],
            stockQuantity: stockQuantity !== undefined ? stockQuantity : null,
            lowStockThreshold: lowStockThreshold || 10,
            variants: variants || [],
            addOns: addOns || [],
            drinks: drinks || [],
            combos: combos || [],
            recommendedItems: recommendedItems || [],
            customizations: customizations || [],
            likes: [],
        });

        console.log('Dish created successfully:', dish._id);
        res.status(201).json(dish);
    } catch (error) {
        console.error('Create dish error:', error);
        res.status(500).json({ message: 'Failed to save dish.', error: error.message });
    }
});

// @desc    Update a dish
// @route   PUT /api/dishes/:id
// @access  Private (Restaurant only)
router.put('/:id', protect, requireRestaurant, checkRestaurantApproval, async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);

        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }

        const { name, description, price, videoUrl, imageUrl, category, addOns, isAvailable, stockQuantity, lowStockThreshold, variants, drinks, combos, customizations, ingredients } = req.body;

        dish.name = name || dish.name;
        dish.description = description || dish.description;
        dish.price = price || dish.price;
        if (videoUrl !== undefined) dish.videoUrl = normalizePath(videoUrl);
        if (imageUrl !== undefined) dish.imageUrl = normalizePath(imageUrl);
        dish.category = category || dish.category;
        if (addOns !== undefined) dish.addOns = addOns;
        if (drinks !== undefined) dish.drinks = drinks;
        if (combos !== undefined) dish.combos = combos;
        if (isAvailable !== undefined) dish.isAvailable = isAvailable;
        if (stockQuantity !== undefined) dish.stockQuantity = stockQuantity;
        if (lowStockThreshold !== undefined) dish.lowStockThreshold = lowStockThreshold;
        if (variants !== undefined) dish.variants = variants;
        if (customizations !== undefined) dish.customizations = customizations;
        if (ingredients !== undefined) dish.ingredients = ingredients;

        await dish.save();
        res.json(dish);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Delete a dish
// @route   DELETE /api/dishes/:id
// @access  Private (Restaurant only)
router.delete('/:id', protect, requireRestaurant, checkRestaurantApproval, async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);

        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }

        await dish.deleteOne();
        res.json({ message: 'Dish deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Get dish by ID
// @route   GET /api/dishes/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id).populate('restaurant', 'name logo');

        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }

        res.json(dish);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Adjust dish stock
// @route   PUT /api/dishes/:id/stock
// @access  Private (Restaurant only)
router.put('/:id/stock', protect, requireRestaurant, async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);

        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }

        const { quantity, operation } = req.body;

        if (quantity === undefined || !operation) {
            return res.status(400).json({ message: 'Quantity and operation are required' });
        }

        switch (operation) {
            case 'set':
                dish.stockQuantity = quantity;
                break;
            case 'add':
                dish.stockQuantity = (dish.stockQuantity || 0) + quantity;
                break;
            case 'subtract':
                dish.stockQuantity = Math.max(0, (dish.stockQuantity || 0) - quantity);
                break;
            default:
                return res.status(400).json({ message: 'Invalid operation. Use set, add, or subtract' });
        }

        await dish.save();

        // Return with stock status
        const stockStatus = dish.stockQuantity === null ? 'unlimited' :
            dish.stockQuantity === 0 ? 'out-of-stock' :
                dish.stockQuantity <= dish.lowStockThreshold ? 'low-stock' :
                    'in-stock';

        res.json({ ...dish.toObject(), stockStatus });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
