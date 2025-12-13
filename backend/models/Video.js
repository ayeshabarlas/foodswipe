const mongoose = require('mongoose');

const videoSchema = mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true,
        },
        videoUrl: {
            type: String,
            required: true,
        },
        thumbnailUrl: {
            type: String,
            default: '',
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        dishName: {
            type: String,
            default: '',
        },
        price: {
            type: Number,
            default: 0,
        },
        ingredients: {
            type: [String],
            default: [],
        },
        duration: {
            type: Number, // in seconds
            default: 0,
        },
        views: {
            type: Number,
            default: 0,
        },
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        shares: {
            type: Number,
            default: 0,
        },
        orderClicks: {
            type: Number,
            default: 0,
        },
        addToCartClicks: {
            type: Number,
            default: 0,
        },
        tags: {
            type: [String],
            default: [],
        },
        cuisineType: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Firebase Storage metadata
        firebaseStoragePath: {
            type: String,
            default: '',
        },
        fileSize: {
            type: Number,
            default: 0,
        },
        videoFormat: {
            type: String,
            default: 'mp4',
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
videoSchema.index({ restaurant: 1, isActive: 1 });
videoSchema.index({ cuisineType: 1, isActive: 1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ createdAt: -1 });

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
