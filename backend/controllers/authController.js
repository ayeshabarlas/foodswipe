// authController.js
// Handles user registration, login, OTP flow, Firebase token verification, phone verification, and profile updates.

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // used by User model for hashing
const User = require('../models/User');
const Otp = require('../models/Otp');
const { admin } = require('../config/firebase');

// Helper to generate a JWT token for a user id
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * @desc    Register a new user (email must be unique per role, phone unique globally)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }
    try {
        const emailExists = await User.findOne({ email, role: role || 'customer' });
        if (emailExists) {
            console.log(`Registration failed: User exists for role ${role || 'customer'}`, { email });
            return res.status(400).json({ message: 'User with given email already exists for this role' });
        }
        if (phone) {
            const phoneExists = await User.findOne({ phone, role: role || 'customer' });
            if (phoneExists) {
                return res.status(400).json({ message: 'User with given phone already exists for this role' });
            }
        }
        const user = await User.create({ 
            name, 
            email, 
            password: password || '', 
            phone, 
            phoneNumber: phone, // Keep in sync
            role: role || 'customer' 
        });
        console.log(`User registered: id=${user._id}, role=${user.role}`);
        return res.status(201).json({ _id: user._id, name: user.name, email: user.email, phone: user.phone, phoneVerified: user.phoneVerified, role: user.role, token: generateToken(user._id) });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Login user using email or phone (password required unless OTP‑only account)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
    const { identifier, password, role } = req.body; // identifier can be email or phone; role optional
    if (!identifier) {
        return res.status(400).json({ message: 'Identifier (email or phone) is required' });
    }
    try {
        console.log(`Login attempt: identifier=${identifier}, role=${role}`);
        
        // 1. Find the user by email or phone AND strict role match.
        const user = await User.findOne({
            $or: [
                { email: { $regex: new RegExp(`^${identifier}$`, 'i') } },
                { phone: identifier },
                { phoneNumber: identifier }
            ],
            role: role || 'customer'
        });

        if (!user) {
            console.log(`Login failed: No user found for ${identifier} with role ${role || 'customer'}`);
            
            // Check if account exists with a different role for better user experience
            const existsAnywhere = await User.findOne({
                $or: [
                    { email: { $regex: new RegExp(`^${identifier}$`, 'i') } },
                    { phone: identifier },
                    { phoneNumber: identifier }
                ]
            });

            if (existsAnywhere) {
                return res.status(401).json({ 
                    message: `Account not found for this role. Please ensure you've selected the correct role or sign up.` 
                });
            }

            return res.status(401).json({ 
                message: `Account not found for this role. Please ensure you are logging into the correct section.` 
            });
        }

        // 2. Check if the password matches (if password exists)
        if (user.password && user.password.length > 0) {
            const isMatch = await user.matchPassword(password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid password' });
            }
        }

        console.log('User logged in successfully:', { id: user._id, email: user.email, role: user.role });

        // Check user status
        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }

        return res.json({ 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            phone: user.phone, 
            phoneVerified: user.phoneVerified, 
            phoneNumber: user.phoneNumber, 
            role: user.role, // Return the ACTUAL role from DB
            token: generateToken(user._id) 
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Get current logged‑in user info
 * @route   GET /api/auth/me
 * @access  Private (requires auth middleware)
 */
const getMe = async (req, res) => {
    try {
        // req.user is already populated by protect middleware
        if (!req.user) {
            console.log(`getMe: No user found in request (middleware failed?)`);
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        // Return fresh data from DB just in case
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        return res.status(200).json(user);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Send OTP for phone verification (used during signup)
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
const sendOtp = async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
    }
    try {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        await Otp.findOneAndUpdate({ phone }, { phone, otp }, { upsert: true, new: true, setDefaultsOnInsert: true });
        console.log(`OTP for ${phone}: ${otp}`);
        return res.json({ otpSent: true, devOtp: otp, resendAfter: 30 });
    } catch (err) {
        return res.status(500).json({ message: 'Server error sending OTP' });
    }
};

/**
 * @desc    Verify OTP and create user if it does not exist
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res) => {
    const { phone, otp, name, email, password, role } = req.body; // role optional
    if (!phone || !otp) {
        return res.status(400).json({ message: 'Phone and OTP are required' });
    }
    try {
        const record = await Otp.findOne({ phone });
        if (!record || record.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        await Otp.deleteOne({ phone });

        const requestedRole = role || 'customer';
        // Check for existing user with this phone AND requested role
        let user = await User.findOne({
            $or: [{ phone }, { phoneNumber: phone }],
            role: requestedRole
        });

        let type = 'login';
        if (!user) {
            // Check if account exists with a different role
            const existsAnywhere = await User.findOne({
                $or: [{ phone }, { phoneNumber: phone }],
            });

            if (existsAnywhere) {
                return res.status(400).json({ 
                    message: `Account not found for this role. Please ensure you've selected the correct role or sign up.` 
                });
            }

            if (!name || !email) {
                console.log(`VerifyOtp failed: Signup incomplete for ${phone} role ${requestedRole}`);
                return res.status(400).json({ message: 'Name and email required for signup' });
            }
            const emailExists = await User.findOne({ email, role: requestedRole });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use for this role' });
            }
            user = await User.create({ name, email, phone, password: password || '', role: requestedRole });
            console.log(`User created via OTP: id=${user._id}, role=${user.role}`);
            type = 'signup';
        } else {
            console.log(`User logged in via OTP: id=${user._id}, role=${user.role}`);
        }
        return res.json({ verified: true, type, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
    } catch (err) {
        return res.status(500).json({ message: 'Server error verifying OTP' });
    }
};

/**
 * @desc    Verify phone number via Firebase and mark as verified
 * @route   POST /api/auth/verify-phone
 * @access  Private
 */
const verifyPhone = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user's phone verification status
        user.phoneNumber = phoneNumber;
        user.phone = phoneNumber; // Sync both fields
        user.phoneVerified = true;
        user.phoneVerifiedAt = new Date();
        await user.save();

        return res.json({
            success: true,
            phoneVerified: true,
            phoneNumber: user.phoneNumber,
            message: 'Phone number verified successfully'
        });
    } catch (err) {
        console.error('Phone verification error:', err);
        return res.status(500).json({ message: 'Server error verifying phone' });
    }
};

/**
 * @desc    Verify Firebase token (optional flow)
 * @route   POST /api/auth/verify-firebase-token
 * @access  Public
 */
const verifyFirebaseToken = async (req, res) => {
    const { idToken, name, email, phone } = req.body;
    console.log('verifyFirebaseToken called with:', { name, email, phone, idToken: idToken ? 'present' : 'missing' });
    
    if (!idToken) {
        return res.status(400).json({ message: 'idToken is required' });
    }
    
    try {
        let decoded;
        try {
            // Verify the ID token using Firebase Admin SDK
            decoded = await admin.auth().verifyIdToken(idToken, true);
        } catch (verifyError) {
            console.error('Firebase verifyIdToken error:', verifyError.message);
            
            // Check if Firebase was actually initialized with credentials
            const firebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
            if (!firebaseConfigured) {
                return res.status(500).json({ 
                    message: 'Backend Configuration Error', 
                    error: 'Firebase service account is not configured on this server. Please check environment variables.',
                    code: 'auth/config-missing'
                });
            }
            
            // Detailed error messages for common issues
            if (verifyError.code === 'auth/id-token-expired') {
                return res.status(401).json({ message: 'Firebase token expired. Please try signing in again.' });
            }
            if (verifyError.code === 'auth/id-token-revoked') {
                return res.status(401).json({ message: 'Firebase token has been revoked. Please sign in again.' });
            }
            if (verifyError.code === 'auth/argument-error') {
                return res.status(401).json({ message: 'Invalid token format.' });
            }
            
            return res.status(401).json({ 
                message: `Firebase Error: ${verifyError.message}`, 
                error: verifyError.message,
                code: verifyError.code 
            });
        }
        
        console.log('Token decoded successfully for:', decoded.email);
        const verifiedPhone = decoded.phone_number || phone;
        const requestedRole = req.body.role || 'customer';
        console.log(`Requested role for ${decoded.email}: ${requestedRole}`);

        // Find user by email AND strict role match. 
        // Using email as primary because Google accounts always have emails.
        let user = await User.findOne({ email: decoded.email, role: requestedRole });
        console.log(`User found by email/role: ${!!user}`);
        
        if (!user && verifiedPhone) {
            user = await User.findOne({
                $or: [{ phone: verifiedPhone }, { phoneNumber: verifiedPhone }],
                role: requestedRole
            });
            console.log(`User found by phone/role: ${!!user}`);
        }

        let type = 'login';
        if (!user) {
            console.log(`Creating new user for ${decoded.email} with role ${requestedRole}`);
            // RELAXED ROLE CHECK: If user exists with another role, we still allow creating a new account for the requested role
            // This allows one email to have multiple roles (Customer, Rider, etc.)
            
            if (!name && !decoded.name) {
                // If we don't have a name from the request or the token, use a fallback
                // but usually decoded.name is present in Google tokens
            }
            
            user = await User.create({
                name: name || decoded.name || 'Google User',
                email: decoded.email,
                phone: verifiedPhone || undefined,
                password: '', // No password for Google users
                role: requestedRole,
                firebaseUid: decoded.uid
            });
            console.log(`User created successfully: ${user._id}`);
            type = 'signup';
        } else {
            console.log(`Existing user found: ${user._id}, checking password...`);
            // Existing user – ensure they are not a password‑based account
            if (user.password && user.password !== '') {
                console.log(`User ${user._id} has a password set, blocking Google login`);
                return res.status(400).json({
                    message: 'This account was created with email/password. Please log in with your email and password instead of Google Sign-In.'
                });
            }
        }
        return res.json({ verified: true, type, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, phoneVerified: user.phoneVerified, role: user.role } });
    } catch (err) {
        console.error('Firebase verification CRITICAL error:', err);
        return res.status(401).json({ 
            message: `Google Login Error: ${err.message}`, 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        });
    }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
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
            user.avatar = req.body.avatar || user.avatar;
            if (req.body.password) {
                user.password = req.body.password;
            }
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                phoneVerified: updatedUser.phoneVerified,
                role: updatedUser.role,
                address: updatedUser.address,
                houseNumber: updatedUser.houseNumber,
                avatar: updatedUser.avatar,
                token: generateToken(updatedUser._id),
                createdAt: updatedUser.createdAt
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { registerUser, loginUser, getMe, sendOtp, verifyOtp, verifyPhone, verifyFirebaseToken, updateProfile };
