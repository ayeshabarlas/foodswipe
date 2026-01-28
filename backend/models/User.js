const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: false, // Password is optional for OTP users
        },
        role: {
            type: String,
            enum: ['customer', 'restaurant', 'rider', 'admin'],
            default: 'customer',
        },
        phone: {
            type: String,
            required: false,
            unique: false, // Changed from true to false to allow same phone for different roles
            sparse: true, // Allow multiple users with no phone number
        },
      phoneNumber: {
            type: String,
            default: null,
        },
        phoneVerified: {
            type: Boolean,
            default: false,
        },
        is_phone_verified: {
            type: Boolean,
            default: false,
        },
        phoneVerifiedAt: {
            type: Date,
            default: null,
        },
        otp: {
            type: String,
            default: null,
        },
        otpExpires: {
            type: Date,
            default: null,
        },
        otpAttempts: {
            type: Number,
            default: 0,
        },
        address: {
            type: String,
            default: '',
        },
        city: {
            type: String,
            default: '',
        },
        location: {
            lat: { type: Number },
            lng: { type: Number },
        },
        houseNumber: {
            type: String,
            default: '',
        },
        avatar: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'flagged'],
            default: 'active',
        },
        suspensionDetails: {
            isSuspended: { type: Boolean, default: false },
            suspendedAt: { type: Date },
            unsuspendAt: { type: Date },
            reason: { type: String },
            history: [{
                action: { type: String, enum: ['suspended', 'unsuspended'] },
                date: { type: Date, default: Date.now },
                reason: { type: String },
                adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
            }]
        },
        firebaseUid: {
            type: String,
            default: null,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        following: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant'
        }],
    },
    {
        timestamps: true,
    }
);

// Compound unique index: same email can exist for different roles
userSchema.index({ email: 1, role: 1 }, { unique: true });
// Compound unique index: same phone can exist for different roles
userSchema.index({ phone: 1, role: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true } } });
// Index for phoneNumber uniqueness across ALL accounts if verified
userSchema.index({ phoneNumber: 1 }, { unique: true, partialFilterExpression: { phoneVerified: true } });

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    // Skip hashing if password wasn't modified or is empty
    if (!this.isModified('password') || !this.password || this.password === '') {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
