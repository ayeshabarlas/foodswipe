const mongoose = require('mongoose');

const promotionSchema = mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Restaurant',
        },
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage',
        },
        value: {
            type: Number,
            required: true,
        },
        code: {
            type: String,
            unique: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'disabled'],
            default: 'active',
        },
        uses: {
            type: Number,
            default: 0,
        },
        maxUses: {
            type: Number,
            default: null,
        },
        revenue: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;
