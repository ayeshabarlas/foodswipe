/**
 * Phone Verification Middleware
 * Checks if customer has verified phone number before allowing order placement
 */
const checkPhoneVerification = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found. Please login again.' });
        }

        // Only require phone verification for customers
        // Check for both boolean true and string "true"
        const isVerified = user.phoneVerified === true || user.phoneVerified === 'true';
        
        if (user.role === 'customer' && !isVerified) {
            console.log(`Phone verification required for user: ${user._id}`);
            return res.status(403).json({
                message: 'Phone verification required to place orders',
                requiresPhoneVerification: true,
                phoneVerified: false
            });
        }

        next();
    } catch (error) {
        console.error('Phone verification middleware error:', error);
        return res.status(500).json({ 
            message: 'Internal server error during phone verification check',
            error: error.message 
        });
    }
};

module.exports = { checkPhoneVerification };
