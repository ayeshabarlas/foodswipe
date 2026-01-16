const Dish = require('../models/Dish');
const Restaurant = require('../models/Restaurant');
const Deal = require('../models/Deal');

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
        const { page = 1, limit = 10, category } = req.query;

        // MVP: Show all dishes for now, don't be too strict with videoUrl/imageUrl
        // so the feed isn't empty during testing
        const query = {};

        if (category) {
            query.category = category;
        }

        console.log('Fetching video feed with query:', JSON.stringify(query));

        // Get all dishes first to see if they exist
        const allDishesCount = await Dish.countDocuments({});
        console.log(`Total dishes in database: ${allDishesCount}`);

        const videos = await Dish.find(query)
            .populate({
                 path: 'restaurant',
                 select: 'name logo rating location address contact verificationStatus isActive',
             })
             .populate('likes', 'name')
             .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .sort({ createdAt: -1 })
            .lean();

        console.log(`Found ${videos.length} dishes for feed from query`);

        // Log a sample dish to see its structure
        if (videos.length > 0) {
            console.log('Sample dish from feed:', JSON.stringify({
                id: videos[0]._id,
                name: videos[0].name,
                restaurantId: videos[0].restaurant?._id,
                restaurantPopulated: !!videos[0].restaurant
            }));
        }

        // Filter out videos with null restaurants only if strictly necessary
        // For MVP, if a dish has no restaurant, we might still want to show it or debug it
        const validVideos = videos.filter(v => {
            if (!v.restaurant) {
                console.warn(`Dish ${v._id} (${v.name}) has no associated restaurant! It will be skipped from feed.`);
                return false;
            }
            return true;
        });

        console.log(`After filtering null restaurants: ${validVideos.length} dishes`);

        // If we have dishes but they were all filtered out, let's see why
        if (videos.length > 0 && validVideos.length === 0) {
            console.error('CRITICAL: All found dishes were filtered out because they lack a restaurant population!');
        }

        // Fetch active deals for these restaurants
        const restaurantIds = validVideos.map(v => v.restaurant._id);
        const activeDeals = await Deal.find({
            restaurant: { $in: restaurantIds },
            isActive: true,
            validUntil: { $gte: new Date() }
        });

        // Attach deals to videos
        const videosWithDeals = validVideos.map(video => {
            const deals = activeDeals.filter(d => d.restaurant.toString() === video.restaurant._id.toString());
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
    // Placeholder - Dish model doesn't have orderClicks yet
    res.json({ message: 'Tracked' });
};

/**
 * @desc    Track add to cart click from video
 * @route   POST /api/videos/:id/track-cart-click
 * @access  Public
 */
const trackCartClick = async (req, res) => {
    // Placeholder - Dish model doesn't have addToCartClicks yet
    res.json({ message: 'Tracked' });
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

        const populatedReview = await Review.findById(review._id).populate('user', 'name');

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

module.exports = {
    createVideo,
    getVideoFeed,
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
};
