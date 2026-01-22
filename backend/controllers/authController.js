// authController.js
// Handles user registration, login, OTP flow, Firebase token verification, phone verification, and profile updates.

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // used by User model for hashing
// Auth Controller - Version 2.0.1 (Force Redeploy)
const User = require('../models/User');
const Otp = require('../models/Otp');
const { admin } = require('../config/firebase');
const { triggerEvent } = require('../socket');
const { notifyAdmins } = require('../utils/adminNotifier');
const AuditLog = require('../models/AuditLog');

// Helper to generate a JWT token for a user id
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * @desc    Helper to ensure role-specific profiles exist
 */
const ensureRoleProfile = async (user) => {
    try {
        const activeRole = user.role;
        if (activeRole === 'rider') {
            const Rider = require('../models/Rider');
            let rider = await Rider.findOne({ user: user._id });
            if (!rider) {
                console.log(`[AutoRepair] Creating missing rider profile for ${user.email}`);
                await Rider.create({
                    user: user._id,
                    fullName: user.name,
                    phone: user.phone || '',
                    verificationStatus: 'approved'
                });
            }
        } else if (activeRole === 'restaurant') {
            const Restaurant = require('../models/Restaurant');
            let restaurant = await Restaurant.findOne({ owner: user._id });
            if (!restaurant) {
                console.log(`[AutoRepair] Creating missing restaurant profile for ${user.email}`);
                await Restaurant.create({
                    owner: user._id,
                    name: `${user.name}'s Restaurant`,
                    contact: user.phone || '',
                    status: 'active'
                });
            }
        }
    } catch (err) {
        console.error('Error in ensureRoleProfile:', err);
    }
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
    
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role || 'customer';

    try {
        // 1. Check if user already exists for this email and role
        const emailExists = await User.findOne({ 
            email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }, 
            role: normalizedRole 
        });
        
        if (emailExists) {
            console.log(`Registration failed: User exists for role ${normalizedRole}`, { email: normalizedEmail });
            return res.status(400).json({ message: 'User with given email already exists for this role' });
        }

        // 2. Check if phone exists for this role
        if (phone) {
            const phoneExists = await User.findOne({ phone: phone.trim(), role: normalizedRole });
            if (phoneExists) {
                return res.status(400).json({ message: 'User with given phone already exists for this role' });
            }
        }

        // 3. Create the User
        const user = await User.create({ 
            name, 
            email: normalizedEmail, 
            password: password || '', 
            phone: phone ? phone.trim() : null, 
            phoneNumber: phone ? phone.trim() : null,
            role: normalizedRole 
        });
        
        console.log(`User registered: id=${user._id}, email=${user.email}, role=${user.role}`);
        
        // Notify Admins (non-blocking)
        notifyAdmins(
            'New User Registration',
            `A new user "${name}" (${normalizedRole}) has registered.`,
            'new_user',
            { userId: user._id, email: user.email, role: user.role }
        ).catch(err => console.error('[Auth] Background notification error:', err));
        
        // 4. Create Role-Specific Profile
        if (normalizedRole === 'rider') {
            const Rider = require('../models/Rider');
            await Rider.create({
                user: user._id,
                fullName: name,
                phone: phone || '',
                verificationStatus: 'approved' // Auto-approve for now as requested before
            });
            console.log(`Created Rider profile for ${user.email}`);
        } else if (normalizedRole === 'restaurant') {
            const Restaurant = require('../models/Restaurant');
            await Restaurant.create({
                owner: user._id,
                name: `${name}'s Restaurant`,
                contact: phone || '',
                status: 'active'
            });
            console.log(`Created Restaurant profile for ${user.email}`);
        }

        // Trigger real-time event for admin dashboard
        triggerEvent('admin', 'user_registered', {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        });

        // Audit Log
        await AuditLog.create({
            event: 'SIGNUP',
            userId: user._id,
            email: user.email,
            role: user.role,
            details: { method: 'email/password' }
        });

        return res.status(201).json({ 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            phone: user.phone, 
            phoneVerified: user.phoneVerified, 
            role: user.role, 
            token: generateToken(user._id) 
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Login user using email or phone (password required unless OTP‑only account)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
    const { identifier, password, role } = req.body; 
    if (!identifier) {
        return res.status(400).json({ message: 'Identifier (email or phone) is required' });
    }
    try {
        const identifierLower = identifier.trim().toLowerCase();
        console.log(`\n--- Login Attempt ---`);
        console.log(`Identifier: "${identifierLower}"`);
        console.log(`Requested Role: "${role}"`);

        // 1. Find the user by email or phone, AND role if provided.
        const query = {
            $or: [
                { email: { $regex: new RegExp(`^${identifierLower}$`, 'i') } },
                { phone: identifier.trim() },
                { phoneNumber: identifier.trim() }
            ]
        };
        
        // If role is provided, we must match it because a single email can have multiple accounts with different roles
        if (role && role !== 'admin' && role !== 'super-admin') {
            query.role = role;
        }

        const user = await User.findOne(query);

        if (!user) {
            console.log(`Login failed: User NOT found for "${identifierLower}" with role "${role}"`);
            
            // Check if user exists with ANY role to give a better error message
            const existingAnyRole = await User.findOne({
                $or: [
                    { email: { $regex: new RegExp(`^${identifierLower}$`, 'i') } },
                    { phone: identifier.trim() }
                ]
            });
            
            if (existingAnyRole) {
                return res.status(401).json({ 
                    message: `Account found as "${existingAnyRole.role}", but you are trying to login as "${role}". Please select the correct role.` 
                });
            }
            
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log(`User found: ${user.email}, DB Role: ${user.role}, Status: ${user.status}`);

        // 2. Role Check
        // If the user is an admin/super-admin, they can login to anything.
        // Otherwise, the role must match.
        if (role && user.role !== role && user.role !== 'admin' && user.role !== 'super-admin') {
            console.log(`Login failed: Role mismatch. Frontend asked for "${role}", but user is "${user.role}"`);
            return res.status(401).json({ message: 'Invalid role for this account' });
        }

        // 3. Status Check
        if (user.status === 'suspended') {
            console.log(`Login failed: Account ${user.email} is suspended`);
            return res.status(403).json({ 
                message: 'Your account has been suspended. Please contact support.',
                status: 'suspended'
            });
        }

        // 4. Password Check
        if (!password) {
            console.log(`Login failed: No password provided for ${user.email}`);
            return res.status(401).json({ message: 'Password is required' });
        }

        if (user.password && user.password.length > 0) {
            const isMatch = await user.matchPassword(password);
            if (!isMatch) {
                console.log(`Login failed: Password mismatch for ${user.email}`);
                return res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            // SOCIAL LOGIN UPGRADE: If user has no password (signed up via Google/Social), 
            // and they are trying to login with a password, let's set it for them!
            // This allows Google users to "unlock" password login by just logging in once with their desired password.
            console.log(`Social Login Upgrade: Setting password for ${user.email}`);
            user.password = password; // The User model's pre-save hook will hash this
            await user.save();
            console.log(`Password set successfully for social user ${user.email}`);
        }

        console.log('✅ Login successful:', { id: user._id, email: user.email, role: user.role });

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Audit Log
        await AuditLog.create({
            event: 'LOGIN',
            userId: user._id,
            email: user.email,
            role: user.role,
            details: { method: 'email/phone' }
        });

        // Ensure role-specific profile exists (AUTO-REPAIR)
        await ensureRoleProfile(user);

        return res.json({ 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            phone: user.phone, 
            phoneVerified: user.phoneVerified, 
            phoneNumber: user.phoneNumber, 
            role: user.role,
            token: generateToken(user._id) 
        });
    } catch (err) {
        console.error('Login error:', err);
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
 * @desc    Check if phone number is already linked to an account
 * @route   POST /api/auth/check-phone
 * @access  Public
 */
const checkPhoneExists = async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        // Clean the phone number to match how it's stored
        const cleanedPhone = phoneNumber.replace(/\D/g, '');
        
        // Check both 'phone' and 'phoneNumber' fields across ALL roles
        const existingUser = await User.findOne({
            $or: [
                { phone: phoneNumber },
                { phoneNumber: phoneNumber },
                { phone: cleanedPhone },
                { phoneNumber: cleanedPhone }
            ]
        });

        if (existingUser) {
            return res.status(200).json({ 
                exists: true, 
                message: 'This number is already linked' 
            });
        }

        return res.status(200).json({ 
            exists: false, 
            message: 'Number is available' 
        });
    } catch (err) {
        console.error('Check phone error:', err);
        return res.status(500).json({ message: 'Server error checking phone number' });
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
            
            // Trigger real-time event for admin dashboard
            triggerEvent('admin', 'user_registered', {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            });
            triggerEvent('admin', 'stats_updated');
            triggerEvent('admin', 'notification', {
                type: 'info',
                message: `New ${user.role} registered: ${user.name}`
            });

            // Audit Log
            await AuditLog.create({
                event: 'SIGNUP',
                userId: user._id,
                email: user.email,
                role: user.role,
                details: { method: 'otp' }
            });
        } else {
            console.log(`User logged in via OTP: id=${user._id}, role=${user.role}`);
            
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            
            // Trigger real-time event for admin dashboard
            triggerEvent('admin', 'user_logged_in', {
                _id: user._id,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin
            });

            // Audit Log
            await AuditLog.create({
                event: 'LOGIN',
                userId: user._id,
                email: user.email,
                role: user.role,
                details: { method: 'otp' }
            });
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
        const { idToken, phoneNumber } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: 'Firebase ID token is required' });
        }

        // 1. Verify the Firebase ID token
        let decoded;
        try {
            decoded = await admin.auth().verifyIdToken(idToken);
        } catch (verifyError) {
            console.error('Firebase token verification failed:', verifyError);
            return res.status(401).json({ message: 'Invalid or expired verification token' });
        }

        const verifiedPhone = decoded.phone_number;
        if (!verifiedPhone) {
            return res.status(400).json({ message: 'Token does not contain a verified phone number' });
        }

        // 2. Security Check: Ensure the token phone number matches what the client sent
        // (Optional, but good for consistency)
        if (phoneNumber && verifiedPhone !== phoneNumber) {
            console.warn(`Phone mismatch: Token has ${verifiedPhone}, client sent ${phoneNumber}`);
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 3. Uniqueness Check: Is this number already verified by another account?
        const existingUser = await User.findOne({
            $or: [{ phone: verifiedPhone }, { phoneNumber: verifiedPhone }],
            phoneVerified: true,
            _id: { $ne: user._id }
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'This phone number is already linked to another account. Please use a different number.' 
            });
        }

        // 4. Update user's phone verification status
        user.phoneNumber = verifiedPhone;
        user.phone = verifiedPhone; // Sync both fields
        user.phoneVerified = true;
        user.is_phone_verified = true; // Sync both verification fields
        user.phoneVerifiedAt = new Date();
        user.firebaseUid = decoded.uid; // Store Firebase UID for consistency
        await user.save();

        console.log(`Phone verified for user ${user._id}: ${verifiedPhone}`);

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
        // Using case-insensitive regex for email to avoid duplicate account issues.
        const emailRegex = new RegExp(`^${decoded.email}$`, 'i');
        let user = await User.findOne({ email: emailRegex, role: requestedRole });
        console.log(`User found by email/role (${requestedRole}): ${!!user}`);
        
        if (!user) {
            // Check if they have ANY account with this email
            const existingAnyRole = await User.findOne({ email: emailRegex });
            if (existingAnyRole) {
                console.log(`User exists with different role: ${existingAnyRole.role}. Checking for profiles...`);
                
                // If they have a restaurant profile, and requested 'restaurant', use that account!
                if (requestedRole === 'restaurant') {
                    const Restaurant = require('../models/Restaurant');
                    const rest = await Restaurant.findOne({ 
                        $or: [{ owner: existingAnyRole._id }, { contact: existingAnyRole.phone }]
                    });
                    if (rest) {
                        console.log(`[SmartLinking] Found restaurant for existing user. Using this account.`);
                        user = existingAnyRole;
                    }
                }
                
                // If they have a rider profile, and requested 'rider', use that account!
                if (!user && requestedRole === 'rider') {
                    const Rider = require('../models/Rider');
                    const rider = await Rider.findOne({ 
                        $or: [{ user: existingAnyRole._id }, { phone: existingAnyRole.phone }]
                    });
                    if (rider) {
                        console.log(`[SmartLinking] Found rider profile for existing user. Using this account.`);
                        user = existingAnyRole;
                    }
                }
            }
        }

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

            // Trigger real-time event for admin dashboard
            triggerEvent('admin', 'user_registered', {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            });
            triggerEvent('admin', 'stats_updated');
            triggerEvent('admin', 'notification', {
                type: 'info',
                message: `New ${user.role} registered: ${user.name}`
            });

            // Audit Log
            await AuditLog.create({
                event: 'SIGNUP',
                userId: user._id,
                email: user.email,
                role: user.role,
                details: { method: 'google', firebaseUid: decoded.uid }
            });
        } else {
            console.log(`Existing user found: ${user._id}, checking password...`);
            
            // Update last login (already handled later but triggering event here)
            // Trigger real-time event for admin dashboard
            triggerEvent('admin', 'user_logged_in', {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                lastLogin: new Date()
            });

            // Audit Log
            await AuditLog.create({
                event: 'LOGIN',
                userId: user._id,
                email: user.email,
                role: user.role,
                details: { method: 'google', firebaseUid: decoded.uid }
            });
            // Existing user – ensure they are not a password‑based account
            if (user.password && user.password !== '') {
                console.log(`User ${user._id} has a password set, blocking Google login`);
                return res.status(400).json({
                    message: 'This account was created with email/password. Please log in with your email and password instead of Google Sign-In.'
                });
            }
            
            // Link firebaseUid if not already linked
            if (!user.firebaseUid) {
                console.log(`Linking existing user ${user.email} with Firebase UID ${decoded.uid}`);
                user.firebaseUid = decoded.uid;
            }
        }
        // 5. Success - send response
        console.log(`[VerifyToken] User ${user.email} verified successfully. Role: ${user.role}`);
        
        // Update last login timestamp
        user.lastLogin = new Date();
        await user.save();

        // Ensure role-specific profile exists (AUTO-REPAIR)
        await ensureRoleProfile(user);

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
                user.is_phone_verified = false; // Sync both verification fields
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

module.exports = { registerUser, loginUser, getMe, sendOtp, verifyOtp, verifyPhone, verifyFirebaseToken, updateProfile,
    checkPhoneExists
};
