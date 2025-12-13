const mongoose = require('mongoose');

const restaurantWalletSchema = mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true,
            unique: true,
        },
        availableBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        pendingPayout: {
            type: Number,
            default: 0,
            min: 0,
        },
        onHoldAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalCommissionCollected: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalEarnings: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastPayoutDate: {
            type: Date,
            default: null,
        },
        commissionRate: {
            type: Number,
            default: 10, // 10% default commission
            min: 0,
            max: 100,
        },
    },
    {
        timestamps: true,
    }
);

const RestaurantWallet = mongoose.model('RestaurantWallet', restaurantWalletSchema);

module.exports = RestaurantWallet;
