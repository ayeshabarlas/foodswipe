const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Delivery Fees
    deliveryFeeBase: { type: Number, default: 40 },
    deliveryFeePerKm: { type: Number, default: 20 },
    deliveryFeeMax: { type: Number, default: 200 },
    deliveryFee: { type: Number, default: 0 }, // Legacy support
    serviceFee: { type: Number, default: 0 },
    minimumOrderAmount: { type: Number, default: 0 },

    // Commission
    commission: { type: Number, default: 10 }, // Percentage
    commissionRate: { type: Number, default: 15 }, // New field for clearer naming

    // Tax
    taxRate: { type: Number, default: 8 }, // Percentage
    isTaxEnabled: { type: Boolean, default: true },

    // Rider Bonus Settings
    riderBonusTarget: { type: Number, default: 10 },
    riderBonusAmount: { type: Number, default: 200 },

    // General
    supportEmail: { type: String, default: 'app.foodswiphelp@gmail.com' },
    supportPhone: { type: String, default: '+923295599855' },
    announcement: { type: String, default: '' },
    isMaintenanceMode: { type: Boolean, default: false },

    // Feature Toggles
    featureToggles: {
        isOrderingEnabled: { type: Boolean, default: true },
        isRiderSignupEnabled: { type: Boolean, default: true },
        isRestaurantSignupEnabled: { type: Boolean, default: true },
        isGoogleLoginEnabled: { type: Boolean, default: true },
        isWalletEnabled: { type: Boolean, default: true },
        isChatEnabled: { type: Boolean, default: true },
        isReviewsEnabled: { type: Boolean, default: true },
        isPromotionsEnabled: { type: Boolean, default: true },
        isPhoneVerificationEnabled: { type: Boolean, default: true }
    },

    // App Version Management
    appVersion: {
        currentVersion: { type: String, default: '1.0.0' },
        minVersion: { type: String, default: '1.0.0' },
        forceUpdate: { type: Boolean, default: false },
        updateUrl: { type: String, default: 'https://foodswipe.com/update' }
    },

    // Legacy support for appConfig
    appConfig: {
        currentVersion: { type: String, default: '1.0.0' },
        minVersion: { type: String, default: '1.0.0' },
        forceUpdate: { type: Boolean, default: false },
        androidLink: { type: String, default: '' },
        iosLink: { type: String, default: '' }
    },

    // Payment Config
    safepay: {
        environment: { type: String, default: 'sandbox' },
        apiKey: { type: String, default: '' },
        v1Secret: { type: String, default: '' },
        webhookSecret: { type: String, default: '' }
    },

    // Maps Config
    googleMapsApiKey: { type: String, default: 'AIzaSyB75lradye-bSagnFN6tqmlmZC3PyBXl48' },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
