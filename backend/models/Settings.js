const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema(
    {
        commission: {
            type: Number,
            default: 10,
        },
        supportEmail: {
            type: String,
            default: 'app.foodswipehelp@gmail.com',
        },
        announcement: {
            type: String,
            default: '',
        },
        isMaintenanceMode: {
            type: Boolean,
            default: false,
        },
        minimumOrderAmount: {
            type: Number,
            default: 0,
        },
        deliveryFee: {
            type: Number,
            default: 0,
        },
        serviceFee: {
            type: Number,
            default: 0,
        },
        featureToggles: {
            isWalletEnabled: { type: Boolean, default: true },
            isChatEnabled: { type: Boolean, default: true },
            isReviewsEnabled: { type: Boolean, default: true },
            isPromotionsEnabled: { type: Boolean, default: true },
            isPhoneVerificationEnabled: { type: Boolean, default: true },
        },
        safepay: {
            environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
        },
        appConfig: {
            currentVersion: { type: String, default: '1.0.0' },
            minVersion: { type: String, default: '1.0.0' },
            forceUpdate: { type: Boolean, default: false },
            androidLink: { type: String, default: '' },
            iosLink: { type: String, default: '' },
        }
    },
    {
        timestamps: true,
    }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
