const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - general authentication
const protect = async (req, res, next) => {
    let token;

    // Debug logging
    console.log('Auth Middleware - Headers:', req.headers);
    console.log('Auth Middleware - Authorization:', req.headers.authorization);

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                console.log('Auth failed: User not found in DB');
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            return next();
        } catch (error) {
            console.error('Auth failed:', error.message);
            // Return specific error message for debugging
            return res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Admin only middleware
const requireAdmin = async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.log(`Admin access denied. User Role: ${req.user?.role}, ID: ${req.user?._id}`);
        res.status(403).json({ message: `Access denied. Admin only. Current role: ${req.user?.role}` });
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
