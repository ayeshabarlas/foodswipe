/**
 * Phone Verification Middleware
 * Checks if customer has verified phone number before allowing order placement
 */
const checkPhoneVerification = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only require phone verification for customers
        if (user.role === 'customer' && !user.phoneVerified) {
            return res.status(403).json({
                message: 'Phone verification required',
                requiresPhoneVerification: true,
                phoneVerified: false
            });
        }

        next();
    } catch (error) {
        console.error('Phone verification check error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { checkPhoneVerification };
