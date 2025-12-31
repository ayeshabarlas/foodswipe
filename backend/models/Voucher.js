const mongoose = require('mongoose');

const voucherSchema = mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'fixed',
        },
        discount: {
            type: Number,
            required: true,
            min: 0,
        },
        maxDiscount: {
            type: Number,
            default: null, // For percentage discounts
        },
        fundedBy: {
            type: String,
            enum: ['restaurant', 'platform'],
            default: 'platform',
        },
        createdBy: {
            type: String,
            enum: ['platform', 'restaurant'],
            default: 'platform',
        },
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: function () {
                return this.fundedBy === 'restaurant' || this.createdBy === 'restaurant';
            },
        },
        minimumAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxUsage: {
            type: Number,
            default: null, // null means unlimited
        },
        usageCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxUsagePerUser: {
            type: Number,
            default: 1,
            min: 1,
        },
        validFrom: {
            type: Date,
            default: Date.now,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        applicableFor: {
            type: String,
            enum: ['all', 'new_users', 'existing_users'],
            default: 'all',
        },
        usedBy: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                order: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Order',
                },
                usedAt: {
                    type: Date,
                    default: Date.now,
                },
                discountApplied: Number,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
voucherSchema.index({ restaurant: 1, isActive: 1 });
voucherSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Voucher', voucherSchema);
