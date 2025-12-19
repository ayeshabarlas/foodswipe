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

            // If not in User, check Admin collection (for common routes like upload)
            if (!req.user) {
                req.admin = await Admin.findById(decoded.id).select('-password');
                if (req.admin) {
                    req.user = { _id: req.admin._id, role: req.admin.role, name: req.admin.name };
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

// Admin only middleware - strict check against Admin collection
const requireAdmin = async (req, res, next) => {
    // Re-verify against Admin model to be absolutely sure
    try {
        const adminUser = await Admin.findById(req.admin?._id || req.user?._id);
        if (adminUser) {
            req.admin = adminUser;
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Admin only.' });
        }
    } catch (error) {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

// Restaurant owner only middleware
const Restaurant = require('../models/Restaurant');


const requireRestaurant = async (req, res, next) => {
    if (req.user && (req.user.role === 'restaurant' || req.user.role === 'admin')) {
        next();
    } else {
        // Auto-fix: Check if they actually own a restaurant
        try {
            const restaurant = await Restaurant.findOne({ owner: req.user._id });
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
        res.status(403).json({ message: `Access denied. Restaurant owners only. Your role is: ${req.user ? req.user.role : 'none'}` });
    }
};

// Rider only middleware
const requireRider = async (req, res, next) => {
    if (req.user && req.user.role === 'rider') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Riders only.' });
    }
};

module.exports = { protect, requireAdmin, requireRestaurant, requireRider };
