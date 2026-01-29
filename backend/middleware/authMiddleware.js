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

            // If not in User, check Admin collection
            if (!req.user) {
                req.admin = await Admin.findById(decoded.id).select('-password');
                if (req.admin) {
                    // Populate req.user as well for compatibility across the app
                    req.user = { 
                        _id: req.admin._id, 
                        role: req.admin.role, 
                        name: req.admin.role === 'restaurant-manager' ? req.admin.name : 'Admin',
                        email: req.admin.email,
                        isAdmin: true
                    };
                }
            } else {
                // If user is suspended, block most actions
                if (req.user.status === 'suspended') {
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

                // Check if they also exist in Admin collection for special admin roles
                const adminRecord = await Admin.findById(decoded.id).select('-password');
                if (adminRecord) {
                    req.admin = adminRecord;
                } else {
                    // Check if their User role is an admin role
                    const adminRoles = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'];
                    if (adminRoles.includes(req.user.role)) {
                        req.admin = req.user;
                    }
                }
            }

            if (!req.user && !req.admin) {
                console.warn(`[protect] ❌ User/Admin not found for ID: ${decoded.id}`);
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
        const url = req.originalUrl;
        const method = req.method;
        
        console.log(`🛡️ [requireAdmin] Checking access for ${method} ${url}`);
        
        // Check if req.admin or req.user has an admin role
        const adminRoles = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'];
        
        const currentRole = req.admin?.role || req.user?.role;
        const isAuthorized = adminRoles.includes(currentRole);

        if (isAuthorized) {
            console.log(`- ✅ Access granted (Role: ${currentRole})`);
            // Ensure req.admin is set if req.user has the role
            if (!req.admin && req.user) req.admin = req.user;
            return next();
        }

        // Final fallback: re-verify with database just in case
        const userId = req.user?._id || req.admin?._id;
        if (userId) {
            console.log(`- 🔍 Re-verifying user in DB: ${userId}`);
            let adminUser = await Admin.findById(userId);
            if (!adminUser) {
                adminUser = await User.findOne({ 
                    _id: userId, 
                    role: { $in: adminRoles } 
                });
            }

            if (adminUser) {
                console.log(`- ✅ Access granted after DB re-verification (Role: ${adminUser.role})`);
                req.admin = adminUser;
                return next();
            }
        }

        console.warn(`[requireAdmin] ❌ Access denied for user: ${userId || 'unknown'}`);
        return res.status(403).json({ 
            message: 'Access denied. Admin only.',
            debug: {
                hasUser: !!req.user,
                userRole: req.user?.role,
                hasAdmin: !!req.admin,
                adminRole: req.admin?.role,
                userId: userId,
                path: url
            }
        });
    } catch (error) {
        console.error('[requireAdmin] 🔥 Error:', error);
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
