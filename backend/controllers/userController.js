const User = require('../models/User');
const { triggerEvent } = require('../socket');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address,
                houseNumber: user.houseNumber,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;

            // If phone is changed, reset verification status
            if (req.body.phone && req.body.phone !== user.phone) {
                user.phone = req.body.phone;
                user.phoneNumber = req.body.phone; // Keep in sync
                user.phoneVerified = false;
                user.phoneVerifiedAt = null;
            } else {
                user.phone = req.body.phone || user.phone;
            }

            user.address = req.body.address || user.address;
            user.houseNumber = req.body.houseNumber || user.houseNumber;

            const updatedUser = await user.save();

            // Notify admins for real-time dashboard update
            try {
                triggerEvent('admin', 'user_updated', { userId: updatedUser._id, role: updatedUser.role });
            } catch (socketErr) {
                console.warn('⚠️ Socket notification failed:', socketErr.message);
            }

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                phoneVerified: updatedUser.phoneVerified,
                address: updatedUser.address,
                houseNumber: updatedUser.houseNumber,
                token: req.headers.authorization.split(' ')[1],
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
};
