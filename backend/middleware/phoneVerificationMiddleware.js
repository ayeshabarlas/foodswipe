/**
 * Phone Verification Middleware
 * Checks if customer has verified phone number before allowing order placement
 */
const checkPhoneVerification = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const Settings = require('../models/Settings');
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found. Please login again.' });
        }

        // Get system settings
        const settings = await Settings.findOne();
        const isVerificationRequiredBySystem = settings?.featureToggles?.isPhoneVerificationEnabled !== false;

        // Only require phone verification for customers
        const isVerified = user.phoneVerified === true || user.phoneVerified === 'true';
        
        // BYPASS FOR LOCALHOST/DEVELOPMENT
        const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
        const isDev = process.env.NODE_ENV === 'development';
        
        if (user.role === 'customer' && !isVerified) {
            // Check if system globally disabled it
            if (!isVerificationRequiredBySystem) {
                console.log(`[SYSTEM BYPASS] Phone verification globally disabled by Admin`);
                return next();
            }

            if (isLocalhost || isDev) {
                console.log(`[DEV BYPASS] Phone verification skipped for user: ${user._id} on localhost`);
                return next();
            }
            
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
