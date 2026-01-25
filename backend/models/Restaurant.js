const mongoose = require('mongoose');

const restaurantSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        contact: {
            type: String,
            required: true,
        },
        logo: {
            type: String,
            default: '',
        },
        rating: {
            type: Number,
            default: 0,
        },
        reviewCount: {
            type: Number,
            default: 0,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0]
            },
            description: String
        },
        description: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationStatus: {
            type: String,
            enum: ['not_started', 'pending', 'approved', 'rejected'],
            default: 'not_started',
        },
        rejectionReason: {
            type: String,
            default: '',
        },
        ownerCNIC: {
            type: String,
            default: '',
        },
        documents: {
            cnicFront: { type: String, default: '' },
            cnicBack: { type: String, default: '' },
            license: { type: String, default: '' },
            menu: { type: String, default: '' },
        },
        bankDetails: {
            accountType: { type: String, enum: ['bank', 'jazzcash', 'easypaisa'], default: 'bank' },
            accountHolderName: { type: String, default: '' },
            accountNumber: { type: String, default: '' },
            bankName: { type: String, default: '' },
            branchCode: { type: String, default: '' },
            iban: { type: String, default: '' },
            phoneNumber: { type: String, default: '' }, // For JazzCash/EasyPaisa
        },
        businessType: {
            type: String,
            enum: ['home-chef', 'restaurant'],
            default: 'restaurant',
        },
        kitchenPhotos: {
            type: [String],
            default: [],
        },
        sampleDishPhotos: {
            type: [String],
            default: [],
        },
        taxNumber: {
            type: String,
            default: '',
        },
        commissionRate: {
            type: Number,
            default: 15, // 15% for restaurants, 10% for home-chefs (handled in logic)
        },
        storefrontPhoto: {
            type: String,
            default: '',
        },
        menuPhotos: {
            type: [String],
            default: [],
        },
        // New fields for real-time system
        videos: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Video',
        }],
        cuisineTypes: {
            type: [String],
            default: [],
        },
        priceRange: {
            type: String,
            enum: ['$', '$$', '$$$', '$$$$', 'Rs', 'RsRs', 'RsRsRs', 'RsRsRsRs'],
            default: 'RsRs',
        },
        deliveryTime: {
            type: String,
            default: '20-30 min',
        },
        socialMedia: {
            instagram: { type: String, default: '' },
            facebook: { type: String, default: '' },
            twitter: { type: String, default: '' },
            website: { type: String, default: '' },
        },
        menuCategories: {
            type: [String],
            default: ['Popular', 'Main Course', 'Appetizers', 'Beverages', 'Desserts']
        },
        analytics: {
            totalViews: { type: Number, default: 0 },
            totalLikes: { type: Number, default: 0 },
            totalShares: { type: Number, default: 0 },
            totalOrders: { type: Number, default: 0 },
            followersCount: { type: Number, default: 0 },
            profileVisits: { type: Number, default: 0 },
            orderClicks: { type: Number, default: 0 },
            addToCartClicks: { type: Number, default: 0 },
            viewsHistory: [{
                date: { type: Date },
                views: { type: Number, default: 0 },
            }],
        },
        openingHours: {
            monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
            tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
            wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
            thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
            friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
            saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
            sunday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
        },
        coverImage: {
            type: String,
            default: '',
        },
        deliveryZones: [{
            name: { type: String, required: true },
            radius: { type: Number, required: true }, // in km
            deliveryFee: { type: Number, required: true },
            minOrder: { type: Number, default: 0 }
        }],
        // New fields for dashboard settings
        storeStatus: {
            type: String,
            enum: ['open', 'closed', 'busy'],
            default: 'open'
        },
        prepTime: {
            type: Number,
            default: 20
        },
        storeHours: [{
            day: String,
            isOpen: Boolean,
            openTime: String,
            closeTime: String
        }],
        autoAccept: {
            type: Boolean,
            default: false
        },
        orderLimit: {
            type: Number,
            default: 0
        },
        notificationPreferences: {
            sound: { type: Boolean, default: true },
            browser: { type: Boolean, default: true },
            email: { type: Boolean, default: false }
        },
        preferences: {
            darkMode: { type: Boolean, default: false },
            language: { type: String, default: 'English' }
        }
    },
    {
        timestamps: true,
    }
);

// Create geospatial index for location-based queries
restaurantSchema.index({ location: '2dsphere' });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
