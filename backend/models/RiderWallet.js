const mongoose = require('mongoose');

const riderWalletSchema = mongoose.Schema(
    {
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        cashCollected: {
            type: Number,
            default: 0,
            min: 0,
        },
        deliveryEarnings: {
            type: Number,
            default: 0,
            min: 0,
        },
        penalties: {
            type: Number,
            default: 0,
            min: 0,
        },
        bonuses: {
            type: Number,
            default: 0,
            min: 0,
        },
        availableWithdraw: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalEarnings: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastWithdrawDate: {
            type: Date,
            default: null,
        },
        cashToDeposit: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

const RiderWallet = mongoose.model('RiderWallet', riderWalletSchema);

module.exports = RiderWallet;
