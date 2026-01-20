const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

// Helper to generate a JWT token for an admin id
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '30d' });
};

/**
 * @desc    Register a new admin (Publicly only for the first one)
 * @route   POST /api/admin/register
 * @access  Public (Limited)
 */
const registerAdmin = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    try {
        const adminCount = await Admin.countDocuments();
        
        // If there are already admins, only a super-admin can register via invitation flow
        if (adminCount > 0) {
            return res.status(403).json({ 
                message: 'Registration is closed. Please contact a super-admin for an invitation.' 
            });
        }

        // Check if admin already exists
        const adminExists = await Admin.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin with this email already exists' });
        }

        // First admin is always super-admin
        const admin = await Admin.create({
            name,
            email,
            password,
            role: 'super-admin'
        });

        if (admin) {
            console.log(`First super-admin registered: ${email}`);
            return res.status(201).json({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                isAdmin: true,
                token: generateToken(admin._id),
            });
        }
    } catch (err) {
        console.error('Admin registration error:', err);
        return res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Invite a new admin
 * @route   POST /api/admin/invite
 * @access  Private (Super Admin)
 */
const inviteAdmin = async (req, res) => {
    const { email, role, name } = req.body;

    if (!email || !role || !name) {
        return res.status(400).json({ message: 'Email, role, and name are required' });
    }

    try {
        // Check if inviter is super-admin
        const inviter = await Admin.findById(req.admin.id);
        if (!inviter || inviter.role !== 'super-admin') {
            return res.status(403).json({ message: 'Only super-admins can invite others' });
        }

        const adminExists = await Admin.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (adminExists) {
            return res.status(400).json({ message: 'User with this email already has admin access' });
        }

        // Generate invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        const admin = await Admin.create({
            name,
            email,
            role,
            isInvited: true,
            inviteToken,
            inviteExpires,
            status: 'pending'
        });

        // Send email
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/setup-password?token=${inviteToken}`;
        
        const message = `You have been invited to join FoodSwipe as a ${role}. 
        Please click the link below to set your password and complete your registration:
        \n\n${inviteUrl}\n\nThis link will expire in 24 hours.`;

        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #FF6A00;">Welcome to FoodSwipe!</h2>
                <p>You have been invited to join the platform as a <strong>${role}</strong>.</p>
                <p>Please click the button below to set your password and complete your registration:</p>
                <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #FF6A00; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Setup Your Account</a>
                <p style="color: #666; font-size: 12px;">This link will expire in 24 hours.</p>
                <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link: ${inviteUrl}</p>
            </div>
        `;

        await sendEmail({
            email: admin.email,
            subject: 'FoodSwipe Admin Invitation',
            message,
            html
        });

        res.status(201).json({ message: 'Invitation sent successfully', admin });
    } catch (err) {
        console.error('Invite error:', err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Accept invitation and set password
 * @route   POST /api/admin/accept-invite
 * @access  Public
 */
const acceptInvite = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
    }

    try {
        const admin = await Admin.findOne({
            inviteToken: token,
            inviteExpires: { $gt: Date.now() }
        });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid or expired invitation token' });
        }

        admin.password = password;
        admin.isInvited = false;
        admin.inviteToken = undefined;
        admin.inviteExpires = undefined;
        admin.status = 'active';

        await admin.save();

        res.json({ 
            message: 'Password set successfully! You can now login.',
            email: admin.email
        });
    } catch (err) {
        console.error('Accept invite error:', err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Get all admins
 * @route   GET /api/admin/list
 * @access  Private (Super Admin)
 */
const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}).select('-password');
        res.json(admins);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Delete an admin
 * @route   DELETE /api/admin/:id
 * @access  Private (Super Admin)
 */
const deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (admin.role === 'super-admin') {
            const superAdminCount = await Admin.countDocuments({ role: 'super-admin' });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the only super-admin' });
            }
        }

        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: 'Admin deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 * @access  Public
 */
const loginAdmin = async (req, res) => {
    const { identifier, email, password } = req.body;

    try {
        const loginEmail = (email || identifier || "").trim().toLowerCase();
        console.log(`\n=== [DEBUG] ADMIN LOGIN ATTEMPT ===`);
        console.log(`- Raw Email: "${email}"`);
        console.log(`- Raw Identifier: "${identifier}"`);
        console.log(`- Processed Email: "${loginEmail}"`);
        console.log(`- Password Provided: ${password ? 'YES' : 'NO'}`);

        if (!loginEmail || !password) {
            console.log('❌ Login failed: Missing email or password');
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // 1. Check Admin Collection
        console.log(`- Searching Admin collection for: ${loginEmail}`);
        let admin = await Admin.findOne({
            email: { $regex: new RegExp(`^${loginEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (admin) {
            console.log(`- ✅ Found in Admin collection: ${admin.email}, Role: ${admin.role}`);
            const isMatch = await admin.matchPassword(password);
            console.log(`- Password Match: ${isMatch}`);
            
            if (isMatch) {
                const userData = {
                    _id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role || 'admin',
                    isAdmin: true,
                    token: generateToken(admin._id),
                };
                console.log('- ✅ Admin login successful');
                return res.json(userData);
            } else {
                console.log('- ❌ Password mismatch in Admin collection');
                return res.status(401).json({ message: 'Invalid admin credentials' });
            }
        }

        // 2. Check User Collection
        console.log(`- Not found in Admin collection. Searching User collection for: ${loginEmail}`);
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${loginEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            role: { $in: ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'] }
        });

        if (user) {
            console.log(`- ✅ Found in User collection: ${user.email}, Role: ${user.role}`);
            const isMatch = await user.matchPassword(password);
            console.log(`- Password Match: ${isMatch}`);

            if (isMatch) {
                const userData = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role === 'admin' ? 'admin' : user.role, // Use their actual role
                    isAdmin: true,
                    token: generateToken(user._id),
                };
                console.log('- ✅ User-as-admin login successful');
                return res.json(userData);
            } else {
                console.log('- ❌ Password mismatch in User collection');
                return res.status(401).json({ message: 'Invalid admin credentials' });
            }
        }

        console.log(`- ❌ No admin found in either collection for: ${loginEmail}`);
        return res.status(401).json({ 
            message: `Account not registered as Admin (${loginEmail}). Please check your credentials.` 
        });

    } catch (err) {
        console.error('❌ Admin login error:', err);
        return res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Debug endpoint to check if an admin exists
 */
const debugAdminStatus = async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments();
        const userAdminCount = await User.countDocuments({ 
            role: { $in: ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'] } 
        });
        
        const superAdmin = await Admin.findOne({ email: 'superadmin@foodswipe.com' });
        
        res.json({
            adminCount,
            userAdminCount,
            superAdminExists: !!superAdmin,
            superAdminRole: superAdmin?.role,
            timestamp: new Date()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get current logged‑in admin info
 * @route   GET /api/admin/me
 * @access  Private (requires admin protect middleware)
 */
const getAdminMe = async (req, res) => {
    try {
        // Try Admin collection first
        let admin = await Admin.findById(req.admin.id).select('-password');
        
        // If not in Admin collection, try User collection
        if (!admin) {
            admin = await User.findById(req.admin.id).select('-password');
        }

        if (admin) {
            res.json(admin);
        } else {
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { 
    registerAdmin, 
    loginAdmin, 
    getAdminMe, 
    inviteAdmin, 
    acceptInvite, 
    getAllAdmins, 
    deleteAdmin 
};
