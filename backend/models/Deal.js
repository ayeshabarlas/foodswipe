const mongoose = require('mongoose');

const dealSchema = mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Restaurant',
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        discount: {
            type: Number,
            required: true,
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage',
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        applicableItems: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Dish',
        }],
        minimumAmount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;
