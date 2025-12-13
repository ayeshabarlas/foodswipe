// Wallet Controller - Handles wallet updates and transaction recording
const RestaurantWallet = require('../models/RestaurantWallet');
const RiderWallet = require('../models/RiderWallet');
const Transaction = require('../models/Transaction');

/**
 * Update restaurant wallet
 * @param {String} restaurantId - Restaurant ID
 * @param {Number} amount - Amount to add/subtract
 * @param {String} type - Transaction type
 * @param {String} orderId - Order ID (optional)
 * @param {String} description - Description (optional)
 */
const updateRestaurantWallet = async (restaurantId, amount, type, orderId = null, description = '') => {
    try {
        let wallet = await RestaurantWallet.findOne({ restaurant: restaurantId });

        if (!wallet) {
            wallet = await RestaurantWallet.create({ restaurant: restaurantId });
        }

        // Update wallet based on transaction type
        switch (type) {
            case 'earning':
                wallet.availableBalance += amount;
                wallet.pendingPayout += amount;
                wallet.totalEarnings += amount;
                break;
            case 'commission':
                wallet.totalCommissionCollected += amount;
                break;
            case 'payout':
                wallet.pendingPayout -= amount;
                wallet.availableBalance -= amount;
                wallet.lastPayoutDate = new Date();
                break;
            case 'refund':
                wallet.availableBalance -= amount;
                wallet.onHoldAmount += amount;
                break;
            case 'adjustment':
                wallet.availableBalance += amount;
                break;
            default:
                break;
        }

        await wallet.save();

        // Record transaction
        await recordTransaction('restaurant', restaurantId, type, amount, wallet.availableBalance, orderId, description);

        return wallet;
    } catch (error) {
        console.error('Error updating restaurant wallet:', error);
        throw error;
    }
};

/**
 * Update rider wallet
 * @param {String} riderId - Rider ID
 * @param {Number} amount - Amount to add/subtract
 * @param {String} type - Transaction type
 * @param {String} orderId - Order ID (optional)
 * @param {String} description - Description (optional)
 */
const updateRiderWallet = async (riderId, amount, type, orderId = null, description = '') => {
    try {
        let wallet = await RiderWallet.findOne({ rider: riderId });

        if (!wallet) {
            wallet = await RiderWallet.create({ rider: riderId });
        }

        // Update wallet based on transaction type
        switch (type) {
            case 'earning':
                wallet.deliveryEarnings += amount;
                wallet.availableWithdraw += amount;
                wallet.totalEarnings += amount;
                break;
            case 'cash_collected':
                wallet.cashCollected += amount;
                wallet.cashToDeposit += amount;
                break;
            case 'cash_deposit':
                wallet.cashToDeposit -= amount;
                wallet.cashCollected -= amount;
                break;
            case 'payout':
                wallet.availableWithdraw -= amount;
                wallet.lastWithdrawDate = new Date();
                break;
            case 'penalty':
                wallet.penalties += amount;
                wallet.availableWithdraw -= amount;
                break;
            case 'bonus':
                wallet.bonuses += amount;
                wallet.availableWithdraw += amount;
                wallet.totalEarnings += amount;
                break;
            default:
                break;
        }

        await wallet.save();

        // Record transaction
        await recordTransaction('rider', riderId, type, amount, wallet.availableWithdraw, orderId, description);

        return wallet;
    } catch (error) {
        console.error('Error updating rider wallet:', error);
        throw error;
    }
};

/**
 * Record transaction in ledger
 * @param {String} entityType - Entity type (restaurant/rider/platform)
 * @param {String} entityId - Entity ID
 * @param {String} type - Transaction type
 * @param {Number} amount - Amount
 * @param {Number} balanceAfter - Balance after transaction
 * @param {String} orderId - Order ID (optional)
 * @param {String} description - Description (optional)
 */
const recordTransaction = async (entityType, entityId, type, amount, balanceAfter, orderId = null, description = '') => {
    try {
        const entityModel = entityType === 'restaurant' ? 'Restaurant' : entityType === 'rider' ? 'User' : 'Platform';

        const transaction = await Transaction.create({
            entityType,
            entityId,
            entityModel,
            order: orderId,
            type,
            amount,
            balanceAfter,
            description,
        });

        return transaction;
    } catch (error) {
        console.error('Error recording transaction:', error);
        throw error;
    }
};

/**
 * @desc    Get transaction history
 * @route   GET /api/wallet/transactions/:entityType/:entityId
 * @access  Private/Admin
 */
const getTransactionHistory = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const transactions = await Transaction.find({
            entityType,
            entityId,
        })
            .populate('order', 'totalPrice status createdAt')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await Transaction.countDocuments({ entityType, entityId });

        res.json({
            transactions,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    updateRestaurantWallet,
    updateRiderWallet,
    recordTransaction,
    getTransactionHistory,
};
