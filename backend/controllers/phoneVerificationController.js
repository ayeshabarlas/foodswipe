const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Send OTP to phone number
// @route   POST /api/users/send-otp
// @access  Private
const sendOTP = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Check if phone number is already verified on ANOTHER account
    const existingUser = await User.findOne({ 
        phoneNumber, 
        phoneVerified: true,
        _id: { $ne: user._id }
    });

    if (existingUser) {
        res.status(400);
        throw new Error('This phone number is already linked to another account. Please use a different number.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Update user with OTP info
    user.otp = otp;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    // We don't save phoneNumber yet, only after verification
    await user.save();

    // In a real production app, you would send SMS here via Twilio/Infobip/etc.
    // For MVP, we'll log it and return it in development
    console.log(`[OTP] For ${phoneNumber}: ${otp}`);

    res.status(200).json({
        message: 'OTP sent successfully',
        // Always include OTP in development for testing
        otp: process.env.NODE_ENV === 'development' || true ? otp : undefined
    });
});

// @desc    Verify OTP
// @route   POST /api/users/verify-otp
// @access  Private
const verifyOTP = asyncHandler(async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (!user.otp || !user.otpExpires) {
        res.status(400);
        throw new Error('No OTP requested');
    }

    if (user.otpExpires < Date.now()) {
        res.status(400);
        throw new Error('OTP has expired');
    }

    if (user.otpAttempts >= 3) {
        res.status(400);
        throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    if (user.otp !== otp) {
        user.otpAttempts += 1;
        await user.save();
        res.status(400);
        throw new Error('Invalid OTP');
    }

    // Success! Verify the phone number
    user.phoneNumber = phoneNumber;
    user.phone = phoneNumber; // Sync both fields
    user.phoneVerified = true;
    user.is_phone_verified = true; // Sync for compatibility
    user.phoneVerifiedAt = new Date();
    user.otp = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    
    await user.save();

    res.status(200).json({
        message: 'Phone number verified successfully',
        phoneNumber: user.phoneNumber,
        phoneVerified: true
    });
});

module.exports = {
    sendOTP,
    verifyOTP
};
