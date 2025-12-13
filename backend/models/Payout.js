const mongoose = require('mongoose');

const payoutSchema = mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['restaurant', 'rider'],
            required: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'entityModel',
        },
        entityModel: {
            type: String,
            enum: ['Restaurant', 'User'],
            required: true,
        },
        // Legacy fields for backward compatibility
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
        },
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        weekStart: {
            type: Date,
        },
        weekEnd: {
            type: Date,
        },
        totalSales: {
            type: Number,
            default: 0,
        },
        totalCommission: {
            type: Number,
            default: 0,
        },
        netPayable: {
            type: Number,
            default: 0,
        },
        // New comprehensive fields
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        items: [
            {
                orderId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Order',
                },
                amount: Number,
                description: String,
            },
        ],
        bankReference: {
            type: String,
            default: '',
        },
        transactionId: {
            type: String,
        },
        bankDetails: {
            accountName: String,
            accountNumber: String,
            bankName: String,
            iban: String,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'paid', 'verified', 'failed', 'cancelled'],
            default: 'pending',
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        processedAt: {
            type: Date,
        },
        proofUrl: {
            type: String,
        },
        notes: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
payoutSchema.index({ type: 1, status: 1 });
payoutSchema.index({ entityId: 1, createdAt: -1 });
payoutSchema.index({ restaurant: 1 });
payoutSchema.index({ rider: 1 });

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
