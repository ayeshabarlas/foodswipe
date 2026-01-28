const Voucher = require('../models/Voucher');
const Restaurant = require('../models/Restaurant');
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
            const isUsed = voucher.usedBy.some(usage => 
                usage.user && usage.user.toString() === req.user._id.toString()
            );
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

        const isUsed = voucher.usedBy.some(usage => 
            usage.user && usage.user.toString() === req.user._id.toString()
        );

        if (isUsed) {
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
        let restaurant = await Restaurant.findOne({ owner: req.user._id });

        // Smart linking fallback (similar to restaurantController)
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
                console.log(`[Voucher] Smart-linked restaurant ${restaurant._id} to user ${req.user._id}`);
                restaurant.owner = req.user._id;
                await restaurant.save();
            }
        }

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found for this user' });
        }

        const { code, discount, description, expiryDate, minimumAmount, name, discountType } = req.body;

        if (!code || discount === undefined || discount === null || !description || !expiryDate) {
            console.warn('[Voucher] Create attempt failed: Missing fields', { code, discount, description, expiryDate });
            return res.status(400).json({ 
                message: 'Required fields missing', 
                details: 'Please provide code, discount, description, and expiryDate' 
            });
        }

        // Validate discount is a number
        const discountNum = parseFloat(discount);
        if (isNaN(discountNum)) {
            return res.status(400).json({ message: 'Discount must be a valid number' });
        }

        const voucher = await Voucher.create({
            name: name || code.toUpperCase(), 
            code: code.toUpperCase().trim(),
            discount: discountNum,
            discountType: discountType || 'fixed',
            description,
            expiryDate,
            minimumAmount: parseFloat(minimumAmount) || 0,
            createdBy: 'restaurant',
            fundedBy: 'restaurant',
            restaurant: restaurant._id,
            isActive: true,
        });

        // Emit socket event for real-time notification
        triggerEvent('public', 'new_voucher', {
            restaurant: restaurant._id,
            restaurantName: restaurant.name,
            voucher: voucher,
        });

        // Specific event for the restaurant dashboard
        triggerEvent(`restaurant-${restaurant._id}`, 'voucherUpdate', {
            type: 'created',
            voucher: voucher
        });

        res.status(201).json(voucher);
    } catch (error) {
        console.error('Create restaurant voucher error:', error);
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation failed', 
                details: messages.join(', ') 
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({ message: 'A voucher with this code already exists' });
        }
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
        let restaurant = await Restaurant.findOne({ owner: req.user._id });

        // Smart linking fallback
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
                console.log(`[Voucher-Get] Smart-linked restaurant ${restaurant._id} to user ${req.user._id}`);
                restaurant.owner = req.user._id;
                await restaurant.save();
            }
        }

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
        const now = new Date();
        const vouchers = await Voucher.find({
            $or: [
                { restaurant: req.params.restaurantId, createdBy: 'restaurant' },
                { createdBy: 'platform' }
            ],
            isActive: true,
            $or: [
                { expiryDate: { $gte: now } },
                { expiryDate: { $exists: false } }
            ]
        }).sort({ createdAt: -1 });

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

        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (voucher.restaurant.toString() !== restaurant._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        voucher.isActive = !voucher.isActive;
        await voucher.save();

        // Specific event for the restaurant dashboard
        triggerEvent(`restaurant-${restaurant._id}`, 'voucherUpdate', {
            type: 'updated',
            voucher: voucher
        });

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
        const { code, discount, description, expiryDate, minimumAmount, usageLimit, name, fundedBy, restaurantId, discountType } = req.body;

        if (!code || discount === undefined || discount === null || !description || !expiryDate) {
            console.warn('[AdminVoucher] Create attempt failed: Missing fields', { code, discount, description, expiryDate });
            return res.status(400).json({ 
                message: 'Required fields missing', 
                details: 'Please provide code, discount, description, and expiryDate' 
            });
        }

        // Validate discount is a number
        const discountNum = parseFloat(discount);
        if (isNaN(discountNum)) {
            return res.status(400).json({ message: 'Discount must be a valid number' });
        }

        if (fundedBy === 'restaurant' && !restaurantId) {
            return res.status(400).json({ 
                message: 'Restaurant selection is required for restaurant-funded vouchers' 
            });
        }

        const voucher = await Voucher.create({
            name: name || code.toUpperCase(),
            code: code.toUpperCase().trim(),
            description,
            discount: discountNum,
            discountType: discountType || 'fixed',
            expiryDate,
            minimumAmount: parseFloat(minimumAmount) || 0,
            maxUsage: parseInt(usageLimit) || 1000,
            isActive: true,
            createdBy: 'platform',
            fundedBy: fundedBy || 'platform', 
            restaurant: fundedBy === 'restaurant' ? restaurantId : null,
        });

        // Emit socket event for real-time notification
        triggerEvent('public', 'new_voucher', {
            restaurant: fundedBy === 'restaurant' ? restaurantId : null,
            restaurantName: fundedBy === 'restaurant' ? 'Special Offer' : 'FoodSwipe',
            voucher: voucher,
        });

        res.status(201).json(voucher);
    } catch (error) {
        console.error('Create admin voucher error:', error);

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation failed', 
                details: messages.join(', ') 
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({ message: 'A voucher with this code already exists' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all vouchers for Admin (with calculated stats)
// @route   GET /api/vouchers/admin/all
// @access  Private/Admin
const getAllVouchersAdmin = async (req, res) => {
    try {
        const vouchers = await Voucher.find()
            .populate('restaurant', 'name')
            .sort({ createdAt: -1 });

        // Calculate total cost manually since we switched from aggregation
        const vouchersWithStats = vouchers.map(v => {
            const voucherObj = v.toObject();
            voucherObj.totalCost = Array.isArray(v.usedBy) 
                ? v.usedBy.reduce((acc, usage) => acc + (usage.discountApplied || 0), 0)
                : 0;
            return voucherObj;
        });

        res.json(vouchersWithStats);
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
        const adminRoles = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'];
        const isAdmin = adminRoles.includes(req.user.role);

        if (!isAdmin) {
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

        const { code, discount, description, expiryDate, minimumAmount, usageLimit, name, isActive, fundedBy, restaurantId } = req.body;

        voucher.code = code || voucher.code;
        voucher.discount = discount || voucher.discount;
        voucher.description = description || voucher.description;
        voucher.expiryDate = expiryDate || voucher.expiryDate;
        voucher.minimumAmount = minimumAmount !== undefined ? minimumAmount : voucher.minimumAmount;
        voucher.maxUsage = usageLimit !== undefined ? usageLimit : voucher.maxUsage;
        voucher.name = name || voucher.name;
        if (isActive !== undefined) voucher.isActive = isActive;

        if (isAdmin) {
            if (fundedBy) voucher.fundedBy = fundedBy;
            if (restaurantId) voucher.restaurant = restaurantId;
            else if (fundedBy === 'platform') voucher.restaurant = undefined;
        }

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
        const adminRoles = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'];
        const isAdmin = adminRoles.includes(req.user.role);

        if (!isAdmin) {
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

        const voucherId = voucher._id;
        const restaurantId = voucher.restaurant;
        
        await voucher.deleteOne();

        // Specific event for the restaurant dashboard
        triggerEvent(`restaurant-${restaurantId}`, 'voucherUpdate', {
            type: 'deleted',
            voucherId: voucherId
        });

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
