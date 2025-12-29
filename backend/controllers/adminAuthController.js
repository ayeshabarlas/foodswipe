const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const mockDb = require('../data/mockStore');

const useMock = process.env.USE_MOCK_DB === 'true';

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

        if (useMock) {
            // Fallback to mock users when no database connection is used
            const adminUser = await mockDb.users.findOne({ email: loginEmail, role: 'admin' });
            if (!adminUser) {
                console.log(`Admin login failed (mock): No admin found for ${loginEmail}`);
                return res.status(401).json({ message: 'Invalid admin credentials' });
            }
            const isMatch = adminUser.password === password;
            console.log(`Admin password match (mock) for ${loginEmail}: ${isMatch}`);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid admin credentials' });
            }
            const userData = {
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role || 'admin',
                isAdmin: true,
                token: generateToken(adminUser._id),
            };
            console.log('Sending login response (mock):', JSON.stringify(userData, null, 2));
            return res.json(userData);
        }

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
            const userData = {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role || 'admin', // Fallback
                isAdmin: true,
                token: generateToken(admin._id),
            };
            console.log('Sending login response:', JSON.stringify(userData, null, 2));
            return res.json(userData);
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

module.exports = { registerAdmin, loginAdmin, getAdminMe };
