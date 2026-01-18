const mongoose = require('mongoose');

const codLedgerSchema = mongoose.Schema(
    {
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rider',
            required: true,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        cod_collected: {
            type: Number,
            required: true,
            default: 0,
        },
        rider_earning: {
            type: Number,
            required: true,
            default: 0,
        },
        admin_balance: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'paid'],
            default: 'pending',
        },
        settlementDate: {
            type: Date,
        },
        transactionId: {
            type: String, // For JazzCash/Easypaisa reference
        }
    },
    {
        timestamps: true,
    }
);

const CODLedger = mongoose.model('CODLedger', codLedgerSchema);

module.exports = CODLedger;
