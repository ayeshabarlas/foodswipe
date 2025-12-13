const Restaurant = require('../models/Restaurant');
const Rider = require('../models/Rider');

// Middleware to check if restaurant is approved
const checkRestaurantApproval = async (req, res, next) => {
    try {
        const userInfo = req.user;

        if (!userInfo || userInfo.role !== 'restaurant') {
            return next();
        }

        const restaurant = await Restaurant.findOne({ owner: userInfo._id });

        if (!restaurant) {
            return res.status(404).json({
                message: 'Restaurant not found. Please complete registration first.'
            });
        }

        if (restaurant.verificationStatus !== 'approved') {
            return res.status(403).json({
                message: `Your restaurant is ${restaurant.verificationStatus}. You can only add dishes after admin approval.`,
                verificationStatus: restaurant.verificationStatus,
                rejectionReason: restaurant.rejectionReason
            });
        }

        req.restaurant = restaurant;
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Middleware to check if rider is approved
const checkRiderApproval = async (req, res, next) => {
    try {
        const userInfo = req.user;

        if (!userInfo || userInfo.role !== 'rider') {
            return next();
        }

        const rider = await Rider.findOne({ user: userInfo._id });

        if (!rider) {
            return res.status(404).json({
                message: 'Rider profile not found. Please complete registration first.'
            });
        }

        if (rider.verificationStatus !== 'approved') {
            return res.status(403).json({
                message: `Your rider account is ${rider.verificationStatus}. You can only accept orders after admin approval.`,
                verificationStatus: rider.verificationStatus
            });
        }

        req.rider = rider;
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { checkRestaurantApproval, checkRiderApproval };
