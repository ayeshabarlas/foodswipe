const Restaurant = require('../models/Restaurant');
const Video = require('../models/Video');
const User = require('../models/User');

/**
 * Normalizes image/video paths to store only the relative path
 * (e.g., from "http://localhost:5000/uploads/file.jpg" to "/uploads/file.jpg")
 */
const normalizePath = (path) => {
    if (!path) return '';
    // Handle array of paths
    if (Array.isArray(path)) {
        return path.map(p => normalizePath(p));
    }
    // If it's a full URL, extract the path part starting from /uploads/
    if (typeof path === 'string' && path.includes('/uploads/')) {
        const index = path.indexOf('/uploads/');
        return path.substring(index);
    }
    return path;
};

/**
 * @desc    Create a new restaurant
 * @route   POST /api/restaurants/create
 * @access  Private (restaurant owners only)
 */
const createRestaurant = async (req, res) => {
    try {
        const {
            name, address, contact, description, logo, location,
            cuisineTypes, priceRange, socialMedia, openingHours, coverImage,
            ownerCNIC, bankDetails, documents, businessType,
            kitchenPhotos, sampleDishPhotos, taxNumber,
            storefrontPhoto, menuPhotos
        } = req.body;

        // Check if user already has a restaurant
        const existingRestaurant = await Restaurant.findOne({ owner: req.user._id });
        if (existingRestaurant) {
            return res.status(400).json({ message: 'You already have a restaurant registered' });
        }

        // Create restaurant
        const restaurant = await Restaurant.create({
            name,
            owner: req.user._id,
            address,
            contact,
            description,
            logo: normalizePath(logo),
            location,
            cuisineTypes,
            priceRange,
            socialMedia,
            openingHours,
            coverImage: normalizePath(coverImage),
            ownerCNIC,
            bankDetails,
            documents: normalizePath(documents),
            businessType,
            kitchenPhotos: normalizePath(kitchenPhotos),
            sampleDishPhotos: normalizePath(sampleDishPhotos),
            taxNumber,
            storefrontPhoto: normalizePath(storefrontPhoto),
            menuPhotos: normalizePath(menuPhotos),
            verificationStatus: 'pending'
        });

        // Update user role to restaurant (preserve admin role)
        if (req.user.role !== 'restaurant' && req.user.role !== 'admin') {
            await User.findByIdAndUpdate(req.user._id, { role: 'restaurant' });
        }

        // Notify admins about new registration
        if (req.app.get('io')) {
            req.app.get('io').to('admin').emit('restaurant_registered', restaurant);
        }

        res.status(201).json(restaurant);
    } catch (error) {
        console.error('Create restaurant error:', error);
        res.status(500).json({ message: 'Failed to create restaurant', error: error.message });
    }
};

/**
 * @desc    Get restaurant by ID
 * @route   GET /api/restaurants/:id
 * @access  Public
 */
const getRestaurantById = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('videos');

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Increment profile visits
        restaurant.analytics.profileVisits += 1;
        
        // Update views history for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const historyIndex = restaurant.analytics.viewsHistory.findIndex(
            h => h.date && new Date(h.date).getTime() === today.getTime()
        );
        
        if (historyIndex > -1) {
            restaurant.analytics.viewsHistory[historyIndex].views += 1;
        } else {
            restaurant.analytics.viewsHistory.push({ date: today, views: 1 });
        }
        
        // Keep only last 30 days of history
        if (restaurant.analytics.viewsHistory.length > 30) {
            restaurant.analytics.viewsHistory = restaurant.analytics.viewsHistory.slice(-30);
        }

        await restaurant.save();
        res.json(restaurant);
    } catch (error) {
        console.error('Get restaurant error:', error);
        res.status(500).json({ message: 'Failed to get restaurant', error: error.message });
    }
};

/**
 * @desc    Get current user's restaurant
 * @route   GET /api/restaurants/my-restaurant
 * @access  Private
 */
const getMyRestaurant = async (req, res) => {
    try {
        console.log(`Getting restaurant for owner: ${req.user._id} (${req.user.email})`);
        const restaurant = await Restaurant.findOne({ owner: req.user._id })
            .populate('videos');

        if (!restaurant) {
            console.log(`No restaurant found for user ${req.user._id}`);
            return res.status(404).json({ message: 'No restaurant found for this user' });
        }

        // Self-healing: Ensure user has 'restaurant' role if they own a restaurant
        if (req.user.role !== 'restaurant' && req.user.role !== 'admin') {
            console.log(`Fixing role for user ${req.user._id} from ${req.user.role} to restaurant`);
            await User.findByIdAndUpdate(req.user._id, { role: 'restaurant' });
        }

        res.json(restaurant);
    } catch (error) {
        console.error('Get my restaurant error:', error);
        res.status(500).json({ message: 'Failed to get restaurant', error: error.message });
    }
};

/**
 * @desc    Update restaurant
 * @route   PUT /api/restaurants/:id
 * @access  Private (owner only)
 */
const updateRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Check ownership
        if (restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this restaurant' });
        }

        // Update fields
        const allowedUpdates = [
            'name', 'address', 'contact', 'description', 'logo', 'location',
            'cuisineTypes', 'priceRange', 'socialMedia', 'openingHours', 'coverImage', 'isActive', 'deliveryZones', 'bankDetails', 'deliveryTime'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'logo' || field === 'coverImage') {
                    restaurant[field] = normalizePath(req.body[field]);
                } else {
                    restaurant[field] = req.body[field];
                }
            }
        });

        await restaurant.save();
        res.json(restaurant);
    } catch (error) {
        console.error('Update restaurant error:', error);
        res.status(500).json({ message: 'Failed to update restaurant', error: error.message });
    }
};

/**
 * @desc    Get all restaurants
 * @route   GET /api/restaurants
 * @access  Public
 */
const getAllRestaurants = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, cuisineType, priceRange, isVerified } = req.query;

        const query = { isActive: true };

        // Add filters
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        if (cuisineType) {
            query.cuisineTypes = cuisineType;
        }

        if (priceRange) {
            query.priceRange = priceRange;
        }

        if (isVerified !== undefined) {
            query.isVerified = isVerified === 'true';
        }

        const restaurants = await Restaurant.find(query)
            .populate('owner', 'name')
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Restaurant.countDocuments(query);

        res.json({
            restaurants,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            total,
        });
    } catch (error) {
        console.error('Get all restaurants error:', error);
        res.status(500).json({ message: 'Failed to get restaurants', error: error.message });
    }
};

/**
 * @desc    Get restaurant analytics
 * @route   GET /api/restaurants/:id/analytics
 * @access  Private (owner only)
 */
const getRestaurantAnalytics = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).populate('videos');

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Check ownership
        if (restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view analytics' });
        }

        // Get top performing videos
        const videos = await Video.find({ restaurant: restaurant._id, isActive: true })
            .sort({ views: -1 })
            .limit(10)
            .select('title views likes shares orderClicks');

        // Calculate total analytics
        const totalVideoViews = videos.reduce((sum, video) => sum + video.views, 0);
        const totalVideoLikes = videos.reduce((sum, video) => sum + video.likes.length, 0);
        const totalVideoShares = videos.reduce((sum, video) => sum + video.shares, 0);

        // Update restaurant analytics
        restaurant.analytics.totalViews = totalVideoViews;
        restaurant.analytics.totalLikes = totalVideoLikes;
        restaurant.analytics.totalShares = totalVideoShares;
        await restaurant.save();

        res.json({
            overview: {
                totalViews: restaurant.analytics.totalViews,
                totalLikes: restaurant.analytics.totalLikes,
                totalShares: restaurant.analytics.totalShares,
                profileVisits: restaurant.analytics.profileVisits,
                orderClicks: restaurant.analytics.orderClicks,
                addToCartClicks: restaurant.analytics.addToCartClicks,
                totalOrders: restaurant.analytics.totalOrders,
                totalReviews: restaurant.reviewCount || 0,
            },
            viewsHistory: restaurant.analytics.viewsHistory.slice(-30), // Last 30 days
            topVideos: videos,
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ message: 'Failed to get analytics', error: error.message });
    }
};

/**
 * @desc    Track order click from restaurant profile/video
 * @route   POST /api/restaurants/:id/track-order-click
 * @access  Public
 */
const trackOrderClick = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.analytics.orderClicks += 1;
        await restaurant.save();

        res.json({ message: 'Order click tracked' });
    } catch (error) {
        console.error('Track order click error:', error);
        res.status(500).json({ message: 'Failed to track order click' });
    }
};

const Review = require('../models/Review');

/**
 * @desc    Get reviews for a restaurant
 * @route   GET /api/restaurants/:id/reviews
 * @access  Public
 */
const getRestaurantReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ restaurant: req.params.id })
            .populate('user', 'name')
            .populate('dish', 'name imageUrl')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Get restaurant reviews error:', error);
        res.status(500).json({ message: 'Failed to get reviews', error: error.message });
    }
};

/**
 * @desc    Update store settings (hours, status, prep time, logo)
 * @route   PUT /api/restaurants/store-settings
 * @access  Private (owner only)
 */
const updateStoreSettings = async (req, res) => {
    try {
        const { storeStatus, prepTime, storeHours, autoAccept, orderLimit, notificationPreferences, logo } = req.body;

        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        if (storeStatus) restaurant.storeStatus = storeStatus;
        if (prepTime) restaurant.prepTime = prepTime;
        if (storeHours) restaurant.storeHours = storeHours;
        if (autoAccept !== undefined) restaurant.autoAccept = autoAccept;
        if (orderLimit !== undefined) restaurant.orderLimit = orderLimit;
        if (notificationPreferences) restaurant.notificationPreferences = notificationPreferences;
        if (req.body.preferences) restaurant.preferences = req.body.preferences;
        if (logo) {
            console.log(`Updating logo for restaurant ${restaurant._id} to: ${logo}`);
            restaurant.logo = normalizePath(logo);
        }

        const updatedRestaurant = await restaurant.save();
        console.log(`Restaurant ${restaurant._id} settings saved successfully`);

        res.json(updatedRestaurant);
    } catch (error) {
        console.error('Update store settings error:', error);
        res.status(500).json({ message: 'Failed to update store settings', error: error.message });
    }
};

/**
 * @desc    Update preparation time
 * @route   PUT /api/restaurants/prep-time
 * @access  Private (owner only)
 */
const updatePrepTime = async (req, res) => {
    try {
        const { prepTime } = req.body;

        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.prepTime = prepTime;
        await restaurant.save();
        res.json({ message: 'Prep time updated', prepTime: restaurant.prepTime });
    } catch (error) {
        console.error('Update prep time error:', error);
        res.status(500).json({ message: 'Failed to update prep time', error: error.message });
    }
};

/**
 * @desc    Get restaurant menu with auto-generated categories
 * @route   GET /api/restaurants/:id/menu
 * @access  Public
 */
const Dish = require('../models/Dish');

const getRestaurantMenu = async (req, res) => {
    try {
        const restaurantId = req.params.id;
        const dishes = await Dish.find({ restaurant: restaurantId, isAvailable: true });

        // 1. Popular Items (Top 10 by views/likes/orders - using views/likes for now)
        const popularItems = [...dishes]
            .sort((a, b) => (b.views + b.likes.length) - (a.views + a.likes.length))
            .slice(0, 10);

        // 2. Exclusive Discounted Deals (Items with discount > 0)
        const discountedDeals = dishes.filter(dish => dish.discount && dish.discount > 0);

        // 3. Restaurant Categories
        const categories = [...new Set(dishes.map(dish => dish.category))];

        // Build the menu structure
        const menu = [
            {
                name: 'Popular',
                type: 'auto',
                items: popularItems
            },
            {
                name: 'Exclusive Discounted Deals',
                type: 'auto',
                items: discountedDeals
            },
            ...categories.map(category => ({
                name: category,
                type: 'restaurant',
                items: dishes.filter(dish => dish.category === category)
            }))
        ];

        // Filter out empty sections
        const nonEmptyMenu = menu.filter(section => section.items.length > 0);

        res.json(nonEmptyMenu);
    } catch (error) {
        console.error('Get restaurant menu error:', error);
        res.status(500).json({ message: 'Failed to get restaurant menu', error: error.message });
    }
};

/**
 * @desc    Submit verification documents
 * @route   POST /api/restaurants/verify
 * @access  Private (owner only)
 */
const submitVerification = async (req, res) => {
    try {
        const { ownerCNIC, bankDetails, documents } = req.body;

        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.ownerCNIC = ownerCNIC;
        restaurant.bankDetails = bankDetails;
        restaurant.documents = documents;
        restaurant.verificationStatus = 'pending';

        await restaurant.save();

        res.json({ message: 'Verification submitted successfully', restaurant });
    } catch (error) {
        console.error('Submit verification error:', error);
        res.status(500).json({ message: 'Failed to submit verification', error: error.message });
    }
};


module.exports = {
    createRestaurant,
    getRestaurantById,
    getMyRestaurant,
    updateRestaurant,
    getAllRestaurants,
    getRestaurantAnalytics,
    trackOrderClick,
    getRestaurantReviews,
    updateStoreSettings,
    updatePrepTime,
    getRestaurantMenu,
    submitVerification,
};

