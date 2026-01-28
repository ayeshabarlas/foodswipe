const mongoose = require('mongoose');
const Dish = require('../models/Dish');
const Restaurant = require('../models/Restaurant');
const Deal = require('../models/Deal');
const User = require('../models/User');
const { triggerEvent } = require('../socket');

/**
 * @desc    Create a new video (Legacy - now handled by Dish creation)
 * @route   POST /api/videos/create
 * @access  Private (restaurant owners only)
 */
const createVideo = async (req, res) => {
    res.status(400).json({ message: 'Please use /api/dishes to create dishes with videos' });
};

/**
 * @desc    Get video feed for customers (TikTok-style)
 * @route   GET /api/videos/feed
 * @access  Public
 */
const getVideoFeed = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, lat, lng, search } = req.query;

        // MVP: Show all dishes for now
        const query = {};
        if (category && category !== 'All') {
            const escapedCategory = category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Use a more flexible regex for category
            // This will match "Burger" if "Burgers" is selected and vice versa
            let categoryRegex = escapedCategory;
            if (escapedCategory.toLowerCase().endsWith('s')) {
                categoryRegex = `${escapedCategory}|${escapedCategory.slice(0, -1)}`;
            } else {
                categoryRegex = `${escapedCategory}|${escapedCategory}s`;
            }

            query.$or = [
                { category: { $regex: categoryRegex, $options: 'i' } },
                { name: { $regex: escapedCategory, $options: 'i' } },
                { description: { $regex: escapedCategory, $options: 'i' } }
            ];
        }
        
        if (search) {
            const trimmedSearch = search.trim();
            // Escape special characters for regex
            const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Find restaurants matching the search query
            const matchingRestaurants = await Restaurant.find({
                name: { $regex: escapedSearch, $options: 'i' }
            }).select('_id');
            const restaurantIds = matchingRestaurants.map(r => r._id);

            query.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { description: { $regex: escapedSearch, $options: 'i' } },
                { category: { $regex: escapedSearch, $options: 'i' } },
                { ingredients: { $in: [new RegExp(escapedSearch, 'i')] } },
                { restaurant: { $in: restaurantIds } }
            ];
            
            console.log(`[Search] Matched ${restaurantIds.length} restaurants for "${trimmedSearch}":`, restaurantIds);
        }

        console.log(`Fetching video feed with query: ${JSON.stringify(query)}, lat: ${lat}, lng: ${lng}, search: ${search}`);

        // Get all dishes with populated restaurant
        let videos = await Dish.find(query)
            .populate({
                 path: 'restaurant',
                 select: 'name logo rating location address contact verificationStatus isActive businessType',
             })
             .populate('likes', 'name')
             .sort({ createdAt: -1 })
             .lean();

        // Distance-based sorting if coordinates provided
        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);

            videos = videos.map(video => {
                let distance = Infinity;
                if (video.restaurant?.location?.coordinates) {
                    const [restLng, restLat] = video.restaurant.location.coordinates;
                    // Haversine formula for sorting (approximate distance)
                    const R = 6371; // km
                    const dLat = (restLat - userLat) * Math.PI / 180;
                    const dLon = (restLng - userLng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                              Math.cos(userLat * Math.PI / 180) * Math.cos(restLat * Math.PI / 180) *
                              Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    distance = R * c;
                }
                return { ...video, distance };
            });

            // Sort by distance (nearest first)
            videos.sort((a, b) => a.distance - b.distance);
        }

        // Apply pagination after sorting
        const start = (parseInt(page) - 1) * parseInt(limit);
        const paginatedVideos = videos.slice(start, start + parseInt(limit));

        console.log(`Found ${paginatedVideos.length} dishes for feed`);

        // Attach active deals for these restaurants
        const restaurantIds = paginatedVideos.filter(v => v.restaurant).map(v => v.restaurant._id);
        const activeDeals = restaurantIds.length > 0 ? await Deal.find({
            restaurant: { $in: restaurantIds },
            isActive: true,
            validUntil: { $gte: new Date() }
        }) : [];

        // Attach deals and ensure videoUrl/imageUrl are never empty if they exist
        const videosWithDeals = paginatedVideos.map(video => {
            const deals = video.restaurant ? activeDeals.filter(d => d.restaurant.toString() === video.restaurant._id.toString()) : [];
            
            // Debug logging for video URLs
            if (!video.videoUrl && !video.imageUrl) {
                console.warn(`Dish ${video._id} has NO MEDIA!`);
            }

            return { ...video, activeDeals: deals };
        });

        const total = await Dish.countDocuments(query);

        res.json({
            videos: videosWithDeals,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            total,
        });
    } catch (error) {
        console.error('Get video feed error:', error);
        res.status(500).json({ message: 'Failed to get video feed', error: error.message });
    }
};

/**
 * @desc    Get videos for a specific restaurant
 * @route   GET /api/videos/restaurant/:restaurantId
 * @access  Public
 */
const getRestaurantVideos = async (req, res) => {
    try {
        const videos = await Dish.find({
            restaurant: req.params.restaurantId,
            videoUrl: { $exists: true, $ne: '' }
        })
            .populate('likes', 'name')
            .sort({ createdAt: -1 });

        res.json(videos);
    } catch (error) {
        console.error('Get restaurant videos error:', error);
        res.status(500).json({ message: 'Failed to get restaurant videos', error: error.message });
    }
};

/**
 * @desc    Update video (Legacy - use Dish update)
 * @route   PUT /api/videos/:id
 * @access  Private (owner only)
 */
const updateVideo = async (req, res) => {
    res.status(400).json({ message: 'Please use /api/dishes/:id to update dishes' });
};

/**
 * @desc    Delete video (Legacy - use Dish delete)
 * @route   DELETE /api/videos/:id
 * @access  Private (owner only)
 */
const deleteVideo = async (req, res) => {
    res.status(400).json({ message: 'Please use /api/dishes/:id to delete dishes' });
};

/**
 * @desc    Like/Unlike video (Dish)
 * @route   POST /api/videos/:id/like
 * @access  Private
 */
const likeVideo = async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);

        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }

        const userId = req.user._id;
        const likeIndex = dish.likes.indexOf(userId);

        if (likeIndex > -1) {
            // Unlike
            dish.likes.splice(likeIndex, 1);
        } else {
            // Like
            dish.likes.push(userId);
        }

        await dish.save();

        // Trigger real-time update
        triggerEvent(`video-${dish._id}`, 'videoUpdate', {
            likes: dish.likes.length,
            isLiked: likeIndex === -1,
        });

        // Also trigger on public feed for count updates
        triggerEvent('public-feed', 'dish_updated', {
            _id: dish._id,
            likes: dish.likes,
            shares: dish.shares,
            views: dish.views
        });

        res.json({
            likes: dish.likes.length,
            isLiked: likeIndex === -1,
        });
    } catch (error) {
        console.error('Like video error:', error);
        res.status(500).json({ message: 'Failed to like video', error: error.message });
    }
};

/**
 * @desc    Track video view (Dish)
 * @route   POST /api/videos/:id/view
 * @access  Public
 */
const trackVideoView = async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);

        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }

        dish.views += 1;
        await dish.save();

        triggerEvent(`video-${dish._id}`, 'videoUpdate', {
            views: dish.views
        });

        res.json({ views: dish.views });
    } catch (error) {
        console.error('Track video view error:', error);
        res.status(500).json({ message: 'Failed to track view', error: error.message });
    }
};

/**
 * @desc    Track order click from video
 * @route   POST /api/videos/:id/track-order-click
 * @access  Public
 */
const trackOrderClick = async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }
        dish.orderClicks = (dish.orderClicks || 0) + 1;
        await dish.save();

        triggerEvent(`video-${dish._id}`, 'videoUpdate', {
            orderClicks: dish.orderClicks
        });

        res.json({ orderClicks: dish.orderClicks });
    } catch (error) {
        console.error('Track order click error:', error);
        res.status(500).json({ message: 'Failed to track order click', error: error.message });
    }
};

/**
 * @desc    Track add to cart click from video
 * @route   POST /api/videos/:id/track-cart-click
 * @access  Public
 */
const trackCartClick = async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }
        dish.addToCartClicks = (dish.addToCartClicks || 0) + 1;
        await dish.save();

        triggerEvent(`video-${dish._id}`, 'videoUpdate', {
            addToCartClicks: dish.addToCartClicks
        });

        res.json({ addToCartClicks: dish.addToCartClicks });
    } catch (error) {
        console.error('Track cart click error:', error);
        res.status(500).json({ message: 'Failed to track cart click', error: error.message });
    }
};

/**
 * @desc    Share video (increment share count)
 * @route   POST /api/videos/:id/share
 * @access  Public
 */
const Review = require('../models/Review');

/**
 * @desc    Share video (increment share count)
 * @route   POST /api/videos/:id/share
 * @access  Public
 */
const shareVideo = async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }
        dish.shares += 1;
        await dish.save();

        triggerEvent(`video-${dish._id}`, 'videoUpdate', {
            shares: dish.shares
        });

        res.json({ shares: dish.shares });
    } catch (error) {
        console.error('Share video error:', error);
        res.status(500).json({ message: 'Failed to share video', error: error.message });
    }
};

/**
 * @desc    Comment on video (Create Review)
 * @route   POST /api/videos/:id/comment
 * @access  Private
 */
const commentVideo = async (req, res) => {
    try {
        const { text, rating } = req.body;
        const dish = await Dish.findById(req.params.id);

        if (!dish) {
            return res.status(404).json({ message: 'Dish not found' });
        }

        const review = await Review.create({
            user: req.user._id,
            restaurant: dish.restaurant,
            dish: dish._id,
            video: null, // We are using Dish as video source
            comment: text,
            rating: rating || 5,
        });

        const populatedReview = await Review.findById(review._id).populate('user', 'name profilePicture');

        triggerEvent(`video-${dish._id}`, 'newComment', populatedReview);

        res.status(201).json(populatedReview);
    } catch (error) {
        console.error('Comment video error:', error);
        res.status(500).json({ message: 'Failed to comment', error: error.message });
    }
};

/**
 * @desc    Get comments for video (Get Reviews for Dish)
 * @route   GET /api/videos/:id/comments
 * @access  Public
 */
const getVideoComments = async (req, res) => {
    try {
        const reviews = await Review.find({ dish: req.params.id })
            .populate('user', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ message: 'Failed to get comments', error: error.message });
    }
};

/**
 * @desc    Get following video feed
 * @route   GET /api/videos/following
 * @access  Private
 */
const getFollowingFeed = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user || !user.following || user.following.length === 0) {
            return res.json({ videos: [] });
        }

        const videos = await Dish.find({
            restaurant: { $in: user.following },
            videoUrl: { $exists: true, $ne: '' }
        })
        .populate('restaurant', 'name logo')
        .sort({ createdAt: -1 });

        res.json({ videos });
    } catch (error) {
        console.error('Get following feed error:', error);
        res.status(500).json({ message: 'Failed to get following feed', error: error.message });
    }
};

/**
 * @desc    Follow/Unfollow restaurant
 * @route   POST /api/videos/restaurant/:id/follow
 * @access  Private
 */
const followRestaurant = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const restaurantId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Invalid restaurant ID' });
        }

        const followIndex = user.following.findIndex(id => id.toString() === restaurantId);
        let isFollowing = false;
        
        if (followIndex > -1) {
            // Unfollow
            user.following.splice(followIndex, 1);
            isFollowing = false;
            
            // Decrement restaurant followersCount
            await Restaurant.findByIdAndUpdate(restaurantId, { 
                $inc: { 'analytics.followersCount': -1 } 
            });
        } else {
            // Follow
            user.following.push(restaurantId);
            isFollowing = true;
            
            // Increment restaurant followersCount
            await Restaurant.findByIdAndUpdate(restaurantId, { 
                $inc: { 'analytics.followersCount': 1 } 
            });
        }

        await user.save();

        // Get updated restaurant for real-time update
        const updatedRest = await Restaurant.findById(restaurantId);
        if (updatedRest) {
            triggerEvent(`restaurant-${restaurantId}`, 'restaurantUpdate', updatedRest);
        }

        res.json({ 
            isFollowing,
            followingCount: user.following.length,
            followersCount: updatedRest?.analytics?.followersCount || 0
        });
    } catch (error) {
        console.error('Follow restaurant error:', error);
        res.status(500).json({ message: 'Failed to follow restaurant', error: error.message });
    }
};

module.exports = {
    createVideo,
    getVideoFeed,
    getFollowingFeed,
    getRestaurantVideos,
    updateVideo,
    deleteVideo,
    likeVideo,
    trackVideoView,
    trackOrderClick,
    trackCartClick,
    shareVideo,
    commentVideo,
    getVideoComments,
    followRestaurant,
};
