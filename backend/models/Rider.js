const mongoose = require('mongoose');

const riderSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        cnicNumber: {
            type: String,
            required: false,
            default: ''
        },
        dateOfBirth: {
            type: Date,
            required: false,
            default: null
        },
        city: {
            type: String,
            default: 'Karachi',
        },
        vehicleType: {
            type: String,
            enum: ['Bike', 'Car'],
            default: 'Bike',
        },
        licenseNumber: {
            type: String,
            default: '',
        },
        documents: {
            cnicFront: { type: String, default: '' },
            cnicBack: { type: String, default: '' },
            drivingLicense: { type: String, default: '' },
            vehicleRegistration: { type: String, default: '' },
            profileSelfie: { type: String, default: '' },
        },
        verificationStatus: {
            type: String,
            enum: ['new', 'pending', 'approved', 'rejected'],
            default: 'new',
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        currentLocation: {
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
        status: {
            type: String,
            enum: ['Available', 'Busy', 'Offline'],
            default: 'Offline',
        },
        walletBalance: {
            type: Number,
            default: 0,
        },
        earnings: {
            today: { type: Number, default: 0 },
            thisWeek: { type: Number, default: 0 },
            thisMonth: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        stats: {
            totalDeliveries: { type: Number, default: 0 },
            completedDeliveries: { type: Number, default: 0 },
            cancelledDeliveries: { type: Number, default: 0 },
            rating: { type: Number, default: 0 },
            reviewCount: { type: Number, default: 0 },
            onTimeRate: { type: Number, default: 100 },
            acceptanceRate: { type: Number, default: 100 },
        },
        currentOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },
        bankDetails: {
            bankName: { type: String, default: '' },
            accountNumber: { type: String, default: '' },
            accountTitle: { type: String, default: '' },
        },
        cod_balance: {
            type: Number,
            default: 0,
        },
        earnings_balance: {
            type: Number,
            default: 0,
        },
        settlementStatus: {
            type: String,
            enum: ['active', 'overdue', 'blocked'],
            default: 'active',
        },
        lastSettlementDate: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Optimize for queries
riderSchema.index({ verificationStatus: 1 });
riderSchema.index({ isOnline: 1, verificationStatus: 1 });
riderSchema.index({ user: 1 });

const Rider = mongoose.model('Rider', riderSchema);

module.exports = Rider;
