const Voucher = require('../models/Voucher');
const { triggerEvent } = require('../socket');

// @desc    Get all vouchers
// @route   GET /api/vouchers
// @access  Private
const getVouchers = async (req, res) => {
    try {
        // In a real app, we might filter by user eligibility
        // For now, return all active vouchers that haven't expired
        const vouchers = await Voucher.find({
            isActive: true,
            expiryDate: { $gt: new Date() }
        });

        // Add a 'used' flag if the user has already used it
        const vouchersWithStatus = vouchers.map(voucher => {
            const isUsed = voucher.usedBy.includes(req.user._id);
            return {
                ...voucher.toObject(),
                used: isUsed
            };
        });

        res.json(vouchersWithStatus);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Verify voucher
// @route   POST /api/vouchers/verify
// @access  Private
const verifyVoucher = async (req, res) => {
    const { code, amount } = req.body;

    try {
        const voucher = await Voucher.findOne({
            code: code.toUpperCase(),
            isActive: true,
            expiryDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Invalid or expired voucher' });
        }

        if (voucher.minimumAmount > amount) {
            return res.status(400).json({ message: `Minimum order amount is Rs. ${voucher.minimumAmount}` });
        }

        if (voucher.usedBy.includes(req.user._id)) {
            return res.status(400).json({ message: 'You have already used this voucher' });
        }

        res.json({
            valid: true,
            discount: voucher.discount,
            voucher: voucher
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Create restaurant voucher
 * @route   POST /api/vouchers/restaurant
 * @access  Private (Restaurant owner)
 */
const createRestaurantVoucher = async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const { code, discount, description, expiryDate, minimumAmount, name } = req.body;

        const voucher = await Voucher.create({
            name: name || code.toUpperCase(), // Use code as name if not provided
            code: code.toUpperCase(),
            discount,
            description,
            expiryDate,
            minimumAmount: minimumAmount || 0,
            createdBy: 'restaurant',
            restaurant: restaurant._id,
            isActive: true,
        });

        // Emit socket event for real-time notification
        triggerEvent('public', 'new_voucher', {
            restaurant: restaurant._id,
            restaurantName: restaurant.name,
            voucher: voucher,
        });

        res.status(201).json(voucher);
    } catch (error) {
        console.error('Create restaurant voucher error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get restaurant's vouchers
 * @route   GET /api/vouchers/restaurant/my-vouchers
 * @access  Private (Restaurant owner)
 */
const getRestaurantVouchers = async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const vouchers = await Voucher.find({
            restaurant: restaurant._id,
            createdBy: 'restaurant',
        }).sort({ createdAt: -1 });

        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get vouchers by restaurant ID (for customers)
 * @route   GET /api/vouchers/restaurant/:restaurantId
 * @access  Public
 */
const getVouchersByRestaurant = async (req, res) => {
    try {
        const vouchers = await Voucher.find({
            $or: [
                { restaurant: req.params.restaurantId, createdBy: 'restaurant' },
                { createdBy: 'platform' }
            ],
            isActive: true,
            expiryDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        });

        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Toggle voucher status
 * @route   PUT /api/vouchers/:id/toggle
 * @access  Private (Restaurant owner)
 */
const toggleVoucherStatus = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (voucher.restaurant.toString() !== restaurant._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        voucher.isActive = !voucher.isActive;
        await voucher.save();

        res.json(voucher);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};



/**
 * @desc    Create platform voucher (Admin)
 * @route   POST /api/vouchers/admin
 * @access  Private (Admin)
 */
const createAdminVoucher = async (req, res) => {
    try {
        const { code, discount, description, expiryDate, minimumAmount, usageLimit, name } = req.body;

        const voucher = await Voucher.create({
            name: name || code, // Ensure name is provided
            code: code.toUpperCase(),
            discount,
            description,
            expiryDate,
            minimumAmount: minimumAmount || 0,
            maxUsage: usageLimit || 1000,
            createdBy: 'platform',
            fundedBy: 'platform',
            isActive: true,
        });

        res.status(201).json(voucher);
    } catch (error) {
        console.error('Create admin voucher error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all vouchers for Admin (with calculated stats)
// @route   GET /api/vouchers/admin/all
// @access  Private/Admin
const getAllVouchersAdmin = async (req, res) => {
    try {
        const vouchers = await Voucher.aggregate([
            {
                $addFields: {
                    totalCost: {
                        $sum: '$usedBy.discountApplied'
                    }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update voucher
// @route   PUT /api/vouchers/:id
// @access  Private (Admin/Restaurant)
const updateVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        // Check ownership
        if (req.user.role !== 'admin') {
            if (voucher.createdBy === 'restaurant') {
                const Restaurant = require('../models/Restaurant');
                const restaurant = await Restaurant.findOne({ owner: req.user._id });
                if (!restaurant || voucher.restaurant.toString() !== restaurant._id.toString()) {
                    return res.status(403).json({ message: 'Not authorized' });
                }
            } else {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        const { code, discount, description, expiryDate, minimumAmount, usageLimit, name, isActive } = req.body;

        voucher.code = code || voucher.code;
        voucher.discount = discount || voucher.discount;
        voucher.description = description || voucher.description;
        voucher.expiryDate = expiryDate || voucher.expiryDate;
        voucher.minimumAmount = minimumAmount !== undefined ? minimumAmount : voucher.minimumAmount;
        voucher.maxUsage = usageLimit !== undefined ? usageLimit : voucher.maxUsage;
        voucher.name = name || voucher.name;
        if (isActive !== undefined) voucher.isActive = isActive;

        await voucher.save();
        res.json(voucher);

    } catch (error) {
        console.error('Update voucher error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete voucher
// @route   DELETE /api/vouchers/:id
// @access  Private (Admin/Restaurant)
const deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        // Check ownership
        if (req.user.role !== 'admin') {
            if (voucher.createdBy === 'restaurant') {
                const Restaurant = require('../models/Restaurant');
                const restaurant = await Restaurant.findOne({ owner: req.user._id });
                if (!restaurant || voucher.restaurant.toString() !== restaurant._id.toString()) {
                    return res.status(403).json({ message: 'Not authorized' });
                }
            } else {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        await voucher.deleteOne();
        res.json({ message: 'Voucher removed' });

    } catch (error) {
        console.error('Delete voucher error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getVouchers,
    verifyVoucher,
    createRestaurantVoucher,
    getRestaurantVouchers,
    getVouchersByRestaurant,
    toggleVoucherStatus,
    getAllVouchersAdmin,
    createAdminVoucher,
    updateVoucher,
    deleteVoucher
};
