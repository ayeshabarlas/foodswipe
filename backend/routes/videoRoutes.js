const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createVideo);
router.get('/feed', getVideoFeed);
router.get('/following', protect, getFollowingFeed);
router.get('/restaurant/:restaurantId', getRestaurantVideos);
router.post('/restaurant/:id/follow', protect, followRestaurant);
router.put('/:id', protect, updateVideo);
router.delete('/:id', protect, deleteVideo);
router.post('/:id/like', protect, likeVideo);
router.post('/:id/view', trackVideoView);
router.post('/:id/track-order-click', trackOrderClick);
router.post('/:id/track-cart-click', trackCartClick);
router.post('/:id/share', shareVideo);
router.post('/:id/comment', protect, commentVideo);
router.get('/:id/comments', getVideoComments);

module.exports = router;
