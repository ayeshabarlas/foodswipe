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

            // Use Promise.all to fetch both concurrently if needed, but usually users are in one or the other
            // Strategy: Check Admin first since this is the admin dashboard middleware mostly
            const [adminRecord, userRecord] = await Promise.all([
                Admin.findById(decoded.id).select('-password').lean(),
                User.findById(decoded.id).select('-password').lean()
            ]);

            if (adminRecord) {
                req.admin = adminRecord;
                req.user = { 
                    _id: adminRecord._id, 
                    role: adminRecord.role, 
                    name: adminRecord.role === 'restaurant-manager' ? adminRecord.name : 'Admin',
                    email: adminRecord.email,
                    isAdmin: true
                };
            } else if (userRecord) {
                req.user = userRecord;
                // If user role is an admin role, also set req.admin
                const adminRoles = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'];
                if (adminRoles.includes(userRecord.role)) {
                    req.admin = userRecord;
                }
            }

            if (!req.user && !req.admin) {
                console.warn(`[protect] ❌ User/Admin not found for ID: ${decoded.id}`);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Suspension check
            if (req.user && req.user.status === 'suspended') {
                const isProfileRoute = req.originalUrl.includes('/profile') || 
                                     req.originalUrl.includes('/my-profile') ||
                                     req.originalUrl.includes('/me');
                if (!(isProfileRoute && req.method === 'GET')) {
                    return res.status(403).json({ 
                        message: 'Your account has been suspended.',
                        status: 'suspended'
                    });
                }
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
        const url = req.originalUrl;
        const method = req.method;
        
        console.log(`🛡️ [requireAdmin] Checking access for ${method} ${url}`);
        
        // Check if req.admin or req.user has an admin role
        const adminRoles = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'];
        
        const currentRole = req.admin?.role || req.user?.role;
        const isAuthorized = adminRoles.includes(currentRole);

        if (isAuthorized) {
            console.log(`- ✅ Access granted (Role: ${currentRole})`);
            return next();
        }

        return res.status(403).json({ message: 'Not authorized as an admin' });
    } catch (error) {
        res.status(500).json({ message: 'Server error in admin verification', error: error.message });
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
                    // Optimized: Only fetch the restaurant belonging to this email instead of all
                    const owner = await User.findOne({ email: userEmail }).select('_id');
                    if (owner) {
                        restaurant = await Restaurant.findOne({ owner: owner._id });
                    }
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
