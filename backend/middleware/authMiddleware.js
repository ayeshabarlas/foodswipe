const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Protect routes - general authentication for common users (Customer, Restaurant, Rider)
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

            // First check User collection
            req.user = await User.findById(decoded.id).select('-password');

            if (req.user && req.user.status === 'suspended') {
                // Allow suspended users to fetch their own profile so they can see why they are suspended
                // We check if the request is a GET request to a profile-related endpoint
                const isProfileRoute = req.originalUrl.includes('/profile') || 
                                     req.originalUrl.includes('/my-profile') ||
                                     req.originalUrl.includes('/me');
                const isGetRequest = req.method === 'GET';

                if (!(isProfileRoute && isGetRequest)) {
                    return res.status(403).json({ 
                        message: 'Your account has been suspended. Please contact support.',
                        status: 'suspended',
                        suspensionDetails: req.user.suspensionDetails
                    });
                }
            }

            // If not in User, check Admin collection (for common routes like upload)
            if (!req.user) {
                req.admin = await Admin.findById(decoded.id).select('-password');
                if (req.admin) {
                    // Populate req.user as well for compatibility
                    req.user = { 
                        _id: req.admin._id, 
                        role: req.admin.role, 
                        name: req.admin.name,
                        email: req.admin.email
                    };
                }
            }

            if (!req.user && !req.admin) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Admin only middleware - checks both Admin and User collections
const requireAdmin = async (req, res, next) => {
    try {
        // If protect already found an admin, we can use it directly
        if (req.admin) {
            return next();
        }

        // Check if req.user has an admin role
        const adminRoles = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'];
        if (req.user && adminRoles.includes(req.user.role)) {
            // Populate req.admin for consistency if not already present
            if (!req.admin) {
                req.admin = req.user;
            }
            return next();
        }

        // Final fallback: re-verify with database just in case
        const userId = req.user?._id || req.admin?._id;
        if (userId) {
            let adminUser = await Admin.findById(userId);
            if (!adminUser) {
                adminUser = await User.findOne({ _id: userId, role: { $in: adminRoles } });
            }

            if (adminUser) {
                req.admin = adminUser;
                return next();
            }
        }

        console.warn(`[requireAdmin] Access denied for user: ${req.user?._id || 'unknown'}`);
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    } catch (error) {
        console.error('[requireAdmin] Error:', error);
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

// Restaurant owner only middleware
const Restaurant = require('../models/Restaurant');


const requireRestaurant = async (req, res, next) => {
    if (req.user && (req.user.role === 'restaurant' || req.user.role === 'admin')) {
        return next();
    } else {
        // Auto-fix: Check if they actually own a restaurant
        try {
            let restaurant = await Restaurant.findOne({ owner: req.user._id });
            
            // SMART LINKING: Try to find by contact info if owner ID doesn't match
            if (!restaurant) {
                const userEmail = req.user.email?.toLowerCase();
                const userPhone = req.user.phone || req.user.phoneNumber;
                const normalizedUserPhone = userPhone ? userPhone.replace(/[\s\-\+\(\)]/g, '').slice(-10) : null;

                if (normalizedUserPhone) {
                    restaurant = await Restaurant.findOne({ contact: new RegExp(normalizedUserPhone + '$') });
                }

                if (!restaurant && userEmail) {
                    const allRests = await Restaurant.find({}).populate('owner');
                    restaurant = allRests.find(r => r.owner?.email?.toLowerCase() === userEmail);
                }

                if (restaurant) {
                    console.log(`[SmartLinking] Re-linking restaurant ${restaurant._id} to user ${req.user._id} in middleware`);
                    restaurant.owner = req.user._id;
                    await restaurant.save();
                }
            }

            if (restaurant) {
                console.log(`Auto-fixing role for user ${req.user._id} to restaurant`);
                req.user.role = 'restaurant';
                await User.findByIdAndUpdate(req.user._id, { role: 'restaurant' });
                return next();
            }
        } catch (error) {
            console.error('Auto-fix role error:', error);
        }

        console.log(`Access denied. User role: ${req.user ? req.user.role : 'none'}`);
        res.status(403).json({ message: 'Access denied. Restaurant only.' });
    }
};

// Rider only middleware
const Rider = require('../models/Rider');

const requireRider = async (req, res, next) => {
    if (req.user && (req.user.role === 'rider' || req.user.role === 'admin')) {
        next();
    } else {
        // Auto-fix: Check if they actually have a rider profile
        try {
            let rider = await Rider.findOne({ user: req.user._id });
            
            // SMART LINKING: Try to find by contact info if user ID doesn't match
            if (!rider) {
                const userEmail = req.user.email?.toLowerCase();
                const userPhone = req.user.phone || req.user.phoneNumber;
                const normalizedUserPhone = userPhone ? userPhone.replace(/[\s\-\+\(\)]/g, '').slice(-10) : null;

                if (normalizedUserPhone) {
                    rider = await Rider.findOne({ phone: new RegExp(normalizedUserPhone + '$') });
                }

                if (!rider && userEmail) {
                    rider = await Rider.findOne({ email: userEmail });
                }

                if (rider) {
                    console.log(`[SmartLinking] Re-linking rider ${rider._id} to user ${req.user._id} in middleware`);
                    rider.user = req.user._id;
                    await rider.save();
                }
            }

            if (rider) {
                console.log(`Auto-fixing role for user ${req.user._id} to rider`);
                req.user.role = 'rider';
                await User.findByIdAndUpdate(req.user._id, { role: 'rider' });
                return next();
            }
        } catch (error) {
            console.error('Auto-fix rider role error:', error);
        }

        res.status(403).json({ message: 'Access denied. Riders only.' });
    }
};

module.exports = { protect, requireAdmin, requireRestaurant, requireRider };
