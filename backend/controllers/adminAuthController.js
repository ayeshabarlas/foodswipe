const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User'); // Added User model support

// Helper to generate a JWT token for an admin id
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * @desc    Register a new admin
 * @route   POST /api/admin/register
 * @access  Public
 */
const registerAdmin = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    try {
        // Check if admin already exists
        const adminExists = await Admin.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (adminExists) {
            return res.status(400).json({ message: 'Admin with this email already exists' });
        }

        // Check if this is the first admin (make them super-admin)
        const adminCount = await Admin.countDocuments();
        const role = adminCount === 0 ? 'super-admin' : 'admin';

        // Create admin
        const admin = await Admin.create({
            name,
            email,
            password, // Will be hashed by the pre-save hook
            role
        });

        if (admin) {
            console.log(`New admin registered: ${email} with role: ${role}`);
            return res.status(201).json({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                isAdmin: true,
                token: generateToken(admin._id),
            });
        } else {
            return res.status(400).json({ message: 'Invalid admin data' });
        }
    } catch (err) {
        console.error('Admin registration error:', err);
        return res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 * @access  Public
 */
const loginAdmin = async (req, res) => {
    const { identifier, email, password } = req.body;
    const loginEmail = email || identifier;

    if (!loginEmail || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        console.log(`Admin Login attempt: email=${loginEmail}`);

        // 1. Check Admin Collection first
        let admin = await Admin.findOne({
            email: { $regex: new RegExp(`^${loginEmail}$`, 'i') }
        });

        if (admin) {
            const isMatch = await admin.matchPassword(password);
            console.log(`Admin (Admin Coll) password match for ${loginEmail}: ${isMatch}`);

            if (isMatch) {
                const userData = {
                    _id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role || 'admin',
                    isAdmin: true,
                    token: generateToken(admin._id),
                };
                console.log('Sending admin login response:', JSON.stringify(userData, null, 2));
                return res.json(userData);
            } else {
                return res.status(401).json({ message: 'Invalid admin credentials' });
            }
        }

        // 2. Check User Collection if not found in Admin collection
        console.log(`Checking User collection for ${loginEmail}...`);
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${loginEmail}$`, 'i') },
            role: { $in: ['admin', 'super-admin', 'finance-admin', 'support-admin'] }
        });

        if (user) {
            // User model uses matchPassword or bcrypt.compare?
            // Usually User model has matchPassword method too.
            const isMatch = await user.matchPassword(password);
            console.log(`Admin (User Coll) password match for ${loginEmail}: ${isMatch}`);

            if (isMatch) {
                const userData = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: 'admin',
                    isAdmin: true,
                    token: generateToken(user._id),
                };
                console.log('Sending user-as-admin login response:', JSON.stringify(userData, null, 2));
                return res.json(userData);
            } else {
                return res.status(401).json({ message: 'Invalid admin credentials' });
            }
        }

        console.log(`Admin login failed: No admin/user-admin found for ${loginEmail}`);
        return res.status(401).json({ 
            message: "Account not registered as Admin. Please check your credentials." 
        });

    } catch (err) {
        console.error('Admin login error:', err);
        return res.status(500).json({ message: err.message });
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

module.exports = { registerAdmin, loginAdmin, getAdminMe };
