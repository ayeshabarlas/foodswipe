const mongoose = require('mongoose');

const otpSchema = mongoose.Schema({
    phone: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // Expires in 5 minutes (300 seconds)
    }
});

module.exports = mongoose.model('Otp', otpSchema);
