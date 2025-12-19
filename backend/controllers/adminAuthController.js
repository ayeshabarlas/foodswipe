const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Helper to generate a JWT token for an admin id
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
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
        const admin = await Admin.findOne({
            email: { $regex: new RegExp(`^${loginEmail}$`, 'i') }
        });

        if (!admin) {
            console.log(`Admin login failed: No admin found for ${loginEmail}`);
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        const isMatch = await admin.matchPassword(password);
        console.log(`Admin password match for ${loginEmail}: ${isMatch}`);

        if (isMatch) {
            return res.json({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                isAdmin: true,
                token: generateToken(admin._id),
            });
        } else {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }
    } catch (err) {
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
        const admin = await Admin.findById(req.admin.id).select('-password');
        if (admin) {
            res.json(admin);
        } else {
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { loginAdmin, getAdminMe };
