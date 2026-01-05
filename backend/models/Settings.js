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
        }
    },
    {
        timestamps: true,
    }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
