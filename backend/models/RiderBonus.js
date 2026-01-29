const mongoose = require('mongoose');

const riderBonusSchema = mongoose.Schema(
    {
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rider',
            required: true,
        },
        date: {
            type: String, // Format: YYYY-MM-DD
            required: true,
        },
        dailyDeliveryCount: {
            type: Number,
            default: 0,
        },
        targetDeliveries: {
            type: Number,
            default: 10,
        },
        bonusAmount: {
            type: Number,
            default: 200,
        },
        isBonusAchieved: {
            type: Boolean,
            default: false,
        },
        bonusCreditedAt: {
            type: Date,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one record per rider per day
riderBonusSchema.index({ rider: 1, date: 1 }, { unique: true });

const RiderBonus = mongoose.model('RiderBonus', riderBonusSchema);

module.exports = RiderBonus;
