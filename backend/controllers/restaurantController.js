const Restaurant = require('../models/Restaurant');
const Video = require('../models/Video');
const User = require('../models/User');
const Order = require('../models/Order');
const { triggerEvent } = require('../socket');
const { notifyAdmins } = require('../utils/adminNotifier');
const path = require('path');
const axios = require('axios');

// Geocoding utility function
const geocodeAddress = async (address) => {
    try {
        // Append context if missing to avoid ambiguous results (e.g., Allama Iqbal Town in other cities)
        let query = address;
        if (!address.toLowerCase().includes('lahore')) {
            query = `${address}, Lahore, Pakistan`;
        } else if (!address.toLowerCase().includes('pakistan')) {
            query = `${address}, Pakistan`;
        }

        console.log(`📡 Geocoding address: "${address}" using query: "${query}"`);
        
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                format: 'json',
                q: query,
                limit: 1
            },
            headers: {
                'User-Agent': 'FoodSwipe-App'
            }
        });

        if (response.data && response.data.length > 0) {
            const { lat, lon, display_name } = response.data[0];
            console.log(`✅ Geocoding success: ${display_name} -> [${lat}, ${lon}]`);
            return {
                lat: parseFloat(lat),
                lng: parseFloat(lon),
                description: display_name
            };
        } else {
            console.warn(`⚠️ Geocoding returned no results for: "${query}"`);
            
            // Fallback: try without the appended context if we added it and it failed
            if (query !== address) {
                console.log(`🔄 Retrying geocode with original address: "${address}"`);
                const fallbackRes = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                    params: { format: 'json', q: address, limit: 1 },
                    headers: { 'User-Agent': 'FoodSwipe-App' }
                });
                
                if (fallbackRes.data && fallbackRes.data.length > 0) {
                    const { lat, lon, display_name } = fallbackRes.data[0];
                    return { lat: parseFloat(lat), lng: parseFloat(lon), description: display_name };
                }
            }
        }
    } catch (error) {
        console.error('❌ Geocoding error:', error.message);
    }
    return null;
};

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

        // Geocode address if location is missing or default [0,0]
        let finalLocation = location;
        if ((!location || (location.coordinates[0] === 0 && location.coordinates[1] === 0)) && address) {
            const coords = await geocodeAddress(address);
            if (coords) {
                finalLocation = {
                    type: 'Point',
                    coordinates: [coords.lng, coords.lat],
                    description: address
                };
            }
        }

        // Create restaurant
        const restaurant = await Restaurant.create({
            name,
            owner: req.user._id,
            address,
            contact,
            description,
            logo: normalizePath(logo),
            location: finalLocation,
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
        triggerEvent('admin', 'restaurant_registered', restaurant);

        // Detailed admin notification
        notifyAdmins(
            'New Restaurant Registration',
            `A new restaurant "${name}" has registered and is pending approval.`,
            'new_restaurant',
            { restaurantId: restaurant._id, name: restaurant.name }
        ).catch(err => console.error('[Restaurant] Background notification error:', err));

        res.status(201).json({
            message: 'Restaurant created successfully and is pending approval',
            restaurant
        });
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
        console.log(`[Dashboard] Fetching restaurant for user ID: ${req.user._id} (Role: ${req.user.role}, Email: ${req.user.email})`);
        
        let restaurant = await Restaurant.findOne({ owner: req.user._id })
            .populate('videos');

        if (!restaurant) {
            console.log(`[Dashboard] No restaurant linked to ID ${req.user._id}. Searching by contact info...`);
            
            // SMART LINKING: Try to find a restaurant by owner's email or phone
            const userEmail = req.user.email?.toLowerCase();
            const userPhone = req.user.phone || req.user.phoneNumber;
            const normalizedUserPhone = userPhone ? userPhone.replace(/[\s\-\+\(\)]/g, '').slice(-10) : null;

            // Search by contact phone (using regex for flexibility)
            if (normalizedUserPhone) {
                restaurant = await Restaurant.findOne({ 
                    contact: new RegExp(normalizedUserPhone + '$') 
                }).populate('videos');
            }

            // If still not found, search by owner email
            if (!restaurant && userEmail) {
                const allRests = await Restaurant.find({}).populate('owner').populate('videos');
                restaurant = allRests.find(r => r.owner?.email?.toLowerCase() === userEmail);
            }

            if (restaurant) {
                console.log(`[SmartLinking] AUTO-RECOVERED: Re-linking restaurant ${restaurant._id} ("${restaurant.name}") to user ID ${req.user._id}`);
                restaurant.owner = req.user._id;
                await restaurant.save();
            } else {
                console.log(`[Dashboard] No restaurant found for user ${req.user.email}. Sending 404.`);
                return res.status(404).json({ 
                    message: 'No restaurant profile found. Please create one.',
                    redirect: '/restaurant/register'
                });
            }
        } else {
            console.log(`[Dashboard] Success: Found restaurant "${restaurant.name}" for owner ${req.user._id}`);
        }

        // SELF-HEALING: Ensure user has 'restaurant' role if they own a restaurant
        if (req.user.role !== 'restaurant' && req.user.role !== 'admin') {
            console.log(`[Dashboard] Fixing role for user ${req.user._id} from ${req.user.role} to restaurant`);
            await User.findByIdAndUpdate(req.user._id, { role: 'restaurant' });
        }

        res.json(restaurant);
    } catch (error) {
        console.error('[Dashboard] Error in getMyRestaurant:', error);
        res.status(500).json({ message: 'Failed to retrieve restaurant profile', error: error.message });
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

        // Geocode if:
        // 1. Address changed
        // 2. coordinates are [0, 0]
        // 3. Address is provided but location is NOT provided in request (explicit request to re-geocode)
        const addressChanged = req.body.address && req.body.address !== restaurant.address;
        const hasNoCoordinates = !restaurant.location || 
                                !restaurant.location.coordinates || 
                                (restaurant.location.coordinates[0] === 0 && restaurant.location.coordinates[1] === 0);
        const explicitGeocodeRequest = req.body.address && req.body.location === undefined;
        
        // If address changed or we have no coordinates, or explicitly requested, we should re-geocode
        if (addressChanged || hasNoCoordinates || explicitGeocodeRequest) {
            console.log(`🔄 ${addressChanged ? 'Address changed' : (hasNoCoordinates ? 'Missing coordinates' : 'Explicit geocode request')}. Re-geocoding "${req.body.address || restaurant.address}"...`);
            const addressToGeocode = req.body.address || restaurant.address;
            if (addressToGeocode) {
                const coords = await geocodeAddress(addressToGeocode);
                if (coords) {
                    restaurant.location = {
                        type: 'Point',
                        coordinates: [coords.lng, coords.lat],
                        description: addressToGeocode
                    };
                    console.log(`✅ New coordinates: [${coords.lng}, ${coords.lat}]`);
                }
            }
        }

        // Update fields
        const allowedUpdates = [
            'name', 'address', 'contact', 'description', 'logo',
            'cuisineTypes', 'priceRange', 'socialMedia', 'openingHours', 'coverImage', 'isActive', 'deliveryZones', 'bankDetails', 'deliveryTime', 'businessType'
        ];

        // Only allow updating location if we didn't just geocode it AND it was provided
        if (!(addressChanged || hasNoCoordinates || explicitGeocodeRequest) && req.body.location !== undefined) {
            restaurant.location = req.body.location;
        }

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

        // MVP: Show all restaurants for now, don't be too strict with isActive
        // unless explicitly requested, so users don't see an empty feed
        const query = {}; 
        
        // Add filters
        if (search) {
            const Dish = require('../models/Dish');
            // 1. Find dishes matching search
            const matchingDishes = await Dish.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ]
            }).select('restaurant');
            
            const restaurantIdsFromDishes = matchingDishes.map(d => d.restaurant);

            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { cuisineTypes: { $regex: search, $options: 'i' } },
                { menuCategories: { $regex: search, $options: 'i' } },
                { _id: { $in: restaurantIdsFromDishes } }
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

        console.log('Fetching restaurants with query:', JSON.stringify(query));
        
        const restaurants = await Restaurant.find(query)
            .populate('owner', 'name')
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Restaurant.countDocuments(query);
        console.log(`Found ${total} restaurants`);

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

        // Financial Analytics
        const completedOrders = await Order.find({ 
            restaurant: restaurant._id, 
            status: { $in: ['Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Completed'] } 
        });

        const grossSales = completedOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const adminCommission = completedOrders.reduce((sum, order) => sum + (order.commissionAmount || 0), 0);
        const netEarnings = completedOrders.reduce((sum, order) => sum + (order.restaurantEarning || 0), 0);

        // Calculate total analytics
        const totalVideoViews = videos.reduce((sum, video) => sum + video.views, 0);
        const totalVideoLikes = videos.reduce((sum, video) => sum + video.likes.length, 0);
        const totalVideoShares = videos.reduce((sum, video) => sum + video.shares, 0);

        // Update restaurant analytics
        restaurant.analytics.totalViews = totalVideoViews;
        restaurant.analytics.totalLikes = totalVideoLikes;
        restaurant.analytics.totalShares = totalVideoShares;
        restaurant.analytics.totalOrders = completedOrders.length;
        await restaurant.save();

        res.json({
            overview: {
                totalViews: restaurant.analytics.totalViews,
                totalLikes: restaurant.analytics.totalLikes,
                totalShares: restaurant.analytics.totalShares,
                profileVisits: restaurant.analytics.profileVisits,
                orderClicks: restaurant.analytics.orderClicks,
                addToCartClicks: restaurant.analytics.addToCartClicks,
                totalOrders: completedOrders.length,
                totalReviews: restaurant.reviewCount || 0,
            },
            financials: {
                grossSales,
                adminCommission,
                netEarnings,
                currency: 'Rs'
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
        if (storeHours) {
            restaurant.storeHours = storeHours;
            
            // Sync with openingHours (object format used by mobile)
            const openingHours = {};
            const daysMap = {
                'Monday': 'monday',
                'Tuesday': 'tuesday',
                'Wednesday': 'wednesday',
                'Thursday': 'thursday',
                'Friday': 'friday',
                'Saturday': 'saturday',
                'Sunday': 'sunday'
            };

            storeHours.forEach(hour => {
                const dayKey = daysMap[hour.day];
                if (dayKey) {
                    openingHours[dayKey] = {
                        open: hour.openTime,
                        close: hour.closeTime,
                        isClosed: !hour.isOpen
                    };
                }
            });
            restaurant.openingHours = openingHours;
        }
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

        // Trigger real-time update
        triggerEvent(`restaurant-${restaurant._id}`, 'restaurantUpdate', updatedRestaurant);

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
        const [restaurant, dishes] = await Promise.all([
            Restaurant.findById(restaurantId),
            Dish.find({ restaurant: restaurantId, isAvailable: true })
        ]);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // 1. Popular Items (Top 10 by views/likes/orders)
        const popularItems = [...dishes]
            .sort((a, b) => (b.views + (a.likes?.length || 0)) - (a.views + (a.likes?.length || 0)))
            .slice(0, 10);

        // 2. Exclusive Discounted Deals (Items with discount > 0)
        const discountedDeals = dishes.filter(dish => dish.discount && dish.discount > 0);

        // 3. Restaurant Categories (Use defined categories or fall back to dish categories)
        const definedCategories = restaurant.menuCategories && restaurant.menuCategories.length > 0 
            ? restaurant.menuCategories 
            : [...new Set(dishes.map(dish => dish.category))];

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
            ...definedCategories.map(category => ({
                name: category,
                type: 'restaurant',
                items: dishes.filter(dish => dish.category === category)
            }))
        ];

        // Also add dishes that don't belong to any defined category but exist in the dishes list
        const otherDishes = dishes.filter(dish => !definedCategories.includes(dish.category));
        if (otherDishes.length > 0) {
            const otherCategories = [...new Set(otherDishes.map(d => d.category))];
            otherCategories.forEach(cat => {
                menu.push({
                    name: cat,
                    type: 'restaurant',
                    items: otherDishes.filter(d => d.category === cat)
                });
            });
        }

        // Filter out empty sections
        const nonEmptyMenu = menu.filter(section => section.items.length > 0);

        res.json(nonEmptyMenu);
    } catch (error) {
        console.error('Get restaurant menu error:', error);
        res.status(500).json({ message: 'Failed to get restaurant menu', error: error.message });
    }
};

/**
 * @desc    Update menu categories
 * @route   PUT /api/restaurants/categories
 * @access  Private (owner only)
 */
const updateMenuCategories = async (req, res) => {
    try {
        const { categories } = req.body;

        if (!Array.isArray(categories)) {
            return res.status(400).json({ message: 'Categories must be an array' });
        }

        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.menuCategories = categories;
        await restaurant.save();

        // Trigger Pusher event for real-time menu update
        triggerEvent(`restaurant-${restaurant._id}`, 'menu_updated', {
            restaurantId: restaurant._id,
            categories: restaurant.menuCategories
        });

        res.json({ message: 'Categories updated successfully', categories: restaurant.menuCategories });
    } catch (error) {
        console.error('Update categories error:', error);
        res.status(500).json({ message: 'Failed to update categories', error: error.message });
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


/**
 * @desc    Get completed orders for the last 7 days for current restaurant
 * @route   GET /api/restaurants/orders/history/weekly
 * @access  Private (Owner only)
 */
const getWeeklyOrderHistory = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const orders = await Order.find({
            restaurant: restaurant._id,
            status: { $in: ['Delivered', 'Completed'] },
            createdAt: { $gte: sevenDaysAgo }
        }).sort({ createdAt: -1 });

        // Transform for frontend
        const transformedOrders = orders.map(order => ({
            ...order.toObject(),
            totalAmount: order.totalPrice,
            items: order.orderItems // frontend uses .items in some places
        }));

        res.json(transformedOrders);
    } catch (error) {
        console.error('Get weekly history error:', error);
        res.status(500).json({ message: 'Failed to fetch weekly history', error: error.message });
    }
};

/**
 * @desc    Get restaurant earnings statistics for dashboard
 * @route   GET /api/restaurants/earnings/stats
 * @access  Private (Owner only)
 */
const getRestaurantEarningsStats = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // 1. Get all completed/delivered orders
        const completedOrders = await Order.find({
            restaurant: restaurant._id,
            status: { $in: ['Delivered', 'Completed'] }
        });

        // 2. Aggregate Stats
        const totalEarned = completedOrders.reduce((sum, order) => sum + (order.restaurantEarning || 0), 0);
        const commissionPaid = completedOrders.reduce((sum, order) => sum + (order.commissionAmount || 0), 0);
        const monthlyOrders = completedOrders.filter(order => order.createdAt >= firstDayOfMonth).length;

        // 3. Last Month Comparison for Growth
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastMonthOrders = completedOrders.filter(order => order.createdAt >= firstDayOfLastMonth && order.createdAt <= lastDayOfLastMonth);
        const lastMonthEarnings = lastMonthOrders.reduce((sum, order) => sum + (order.restaurantEarning || 0), 0);
        
        let growth = 0;
        if (lastMonthEarnings > 0) {
            growth = ((totalEarned - lastMonthEarnings) / lastMonthEarnings) * 100;
        } else if (totalEarned > 0) {
            growth = 100;
        }

        // 4. Weekly History Breakdown (Last 4 weeks)
        const weeklyHistory = [];
        for (let i = 0; i < 4; i++) {
            const end = new Date();
            end.setDate(end.getDate() - (i * 7));
            const start = new Date();
            start.setDate(start.getDate() - ((i + 1) * 7));

            const weekOrders = completedOrders.filter(order => order.createdAt >= start && order.createdAt <= end);
            const weekRevenue = weekOrders.reduce((sum, order) => sum + (order.restaurantEarning || 0), 0);
            
            weeklyHistory.push({
                week: 4 - i,
                revenue: weekRevenue,
                orders: weekOrders.length,
                status: 'Delivered'
            });
        }

        res.json({
            totalEarned,
            commissionPaid,
            monthlyOrders,
            growth: Math.round(growth * 10) / 10,
            weeklyHistory: weeklyHistory.reverse()
        });
    } catch (error) {
        console.error('Get earnings stats error:', error);
        res.status(500).json({ message: 'Failed to fetch earnings stats', error: error.message });
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
    submitVerification,
    getRestaurantMenu,
    getWeeklyOrderHistory,
    getRestaurantEarningsStats,
    updateMenuCategories
};

