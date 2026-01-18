const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: function() { return !this.isInvited; }, // Required only if not invited
        },
        role: {
            type: String,
            enum: ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'],
            default: 'admin',
        },
        isInvited: {
            type: Boolean,
            default: false,
        },
        inviteToken: String,
        inviteExpires: Date,
        status: {
            type: String,
            enum: ['active', 'pending', 'suspended'],
            default: 'active',
        }
    },
    {
        timestamps: true,
    }
);

// Match admin entered password to hashed password in database
adminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
