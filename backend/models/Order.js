const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true,
        },
        orderItems: [
            {
                name: { type: String, required: true },
                qty: { type: Number, required: true },
                image: { type: String, required: true },
                price: { type: Number, required: true },
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Dish',
                    required: true,
                },
            },
        ],
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
        },
        paymentMethod: {
            type: String,
            required: true,
            default: 'COD',
        },
        totalPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        subtotal: {
            type: Number,
            default: 0,
        },
        deliveryFee: {
            type: Number,
            default: 0,
        },
        discount: {
            type: Number,
            default: 0,
        },
        voucher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Voucher',
            default: null,
        },
        // Commission & Payment Split (10% commission system)
        commissionRate: {
            type: Number,
            default: 10, // 10% commission
            min: 0,
            max: 100,
        },
        commissionAmount: {
            type: Number,
            default: 0,
        },
        restaurantEarning: {
            type: Number,
            default: 0,
        },
        riderEarning: {
            type: Number,
            default: 0,
        },
        platformRevenue: {
            type: Number,
            default: 0,
        },
        gatewayFee: {
            type: Number,
            default: 0,
        },
        isPaid: {
            type: Boolean,
            required: true,
            default: false,
        },
        paidAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['Pending', 'Accepted', 'Preparing', 'Ready', 'OnTheWay', 'Delivered', 'Cancelled'],
            default: 'Pending',
        },
        cancellationReason: {
            type: String,
        },
        cancelledAt: {
            type: Date,
        },
        prepTime: {
            type: Number, // in minutes
        },
        delayedUntil: {
            type: Date,
        },
        delayReason: {
            type: String,
        },
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rider',
        },
        pickedUpAt: {
            type: Date,
        },
        riderLocation: {
            lat: Number,
            lng: Number,
        },
        estimatedDeliveryTime: {
            type: Date,
        },
        deliveredAt: {
            type: Date,
        },
        payout: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payout',
        },
    },
    {
        timestamps: true,
    }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
