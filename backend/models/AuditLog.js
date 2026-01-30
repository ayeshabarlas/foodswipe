const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema(
    {
        event: {
            type: String,
            required: true,
            enum: [
                'LOGIN', 'SIGNUP', 'LOGOUT', 'SYNC_FIREBASE', 
                'USER_SUSPENDED', 'USER_UNSUSPENDED', 'USER_DELETED', 
                'RESTAURANT_SUSPENDED', 'RESTAURANT_UNSUSPENDED', 'RESTAURANT_DELETED',
                'RESTAURANT_APPROVED', 'RESTAURANT_REJECTED',
                'RIDER_SUSPENDED', 'RIDER_UNSUSPENDED', 'RIDER_DELETED',
                'RIDER_APPROVED', 'RIDER_REJECTED',
                'SETTLE_RIDER', 'ERROR'
            ],
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        email: {
            type: String,
            required: false,
        },
        role: {
            type: String,
            required: false,
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            required: false,
        },
        ipAddress: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            enum: ['SUCCESS', 'FAILURE'],
            default: 'SUCCESS',
        },
        errorMessage: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
