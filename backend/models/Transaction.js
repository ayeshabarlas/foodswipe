const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema(
    {
        entityType: {
            type: String,
            enum: ['restaurant', 'rider', 'platform', 'customer'],
            required: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'entityModel',
        },
        entityModel: {
            type: String,
            enum: ['Restaurant', 'User', 'Platform', 'Rider'],
            required: true,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },
        type: {
            type: String,
            enum: [
                'commission',
                'earning',
                'payout',
                'refund',
                'penalty',
                'bonus',
                'cash_collected',
                'cash_deposit',
                'adjustment',
            ],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        reference: {
            type: String,
            default: '',
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
transactionSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
