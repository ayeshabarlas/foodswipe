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
                image: { type: String, required: false },
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
        deliveryLocation: {
            lat: { type: Number },
            lng: { type: Number },
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
        orderNumber: {
            type: String,
            unique: true,
            sparse: true,
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
            default: null,
        },
        distanceKm: {
            type: Number,
            default: 0,
        },
        grossRiderEarning: {
            type: Number,
            default: 0,
        },
        platformFee: {
            type: Number,
            default: 0,
        },
        netRiderEarning: {
            type: Number,
            default: 0,
        },
        deliveryFeeCustomerPaid: {
            type: Number,
            default: 0,
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

// Generate order number before saving
orderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        // Simple format: FS-XXXX where XXXX is random or incremental
        // For now, let's use a combination of timestamp and random to ensure uniqueness without another query
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderNumber = `FS-${timestamp}${random}`;
    }
    next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
