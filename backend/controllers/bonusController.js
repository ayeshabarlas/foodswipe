const RiderBonus = require('../models/RiderBonus');
const RiderWallet = require('../models/RiderWallet');
const { updateRiderWallet } = require('./walletController');
const { createNotification } = require('./notificationController');
const { triggerEvent } = require('../socket');
const Rider = require('../models/Rider');

/**
 * Update daily delivery count for a rider
 * @param {String} riderId - Rider ID
 */
const trackRiderDeliveryForBonus = async (riderId) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        let bonusRecord = await RiderBonus.findOne({ rider: riderId, date: today });
        
        if (!bonusRecord) {
            bonusRecord = await RiderBonus.create({
                rider: riderId,
                date: today,
                dailyDeliveryCount: 0,
                targetDeliveries: 10,
                bonusAmount: 200
            });
        }
        
        // Don't increment if already achieved for the day (idempotency)
        // Actually, we should increment but check if we JUST reached the target
        bonusRecord.dailyDeliveryCount += 1;
        
        if (bonusRecord.dailyDeliveryCount === bonusRecord.targetDeliveries && !bonusRecord.isBonusAchieved) {
            // Target achieved!
            bonusRecord.isBonusAchieved = true;
            bonusRecord.bonusCreditedAt = new Date();
            
            // 1. Credit Wallet
            await updateRiderWallet(
                riderId, 
                bonusRecord.bonusAmount, 
                'bonus', 
                null, 
                `Daily Target Bonus (${bonusRecord.targetDeliveries} deliveries achieved)`
            );
            
            // 2. Send Notification
            const rider = await Rider.findById(riderId).populate('user');
            if (rider && rider.user) {
                const notification = await createNotification(
                    rider.user._id,
                    'Bonus Unlocked! 🎉',
                    `Congratulations! You've completed ${bonusRecord.targetDeliveries} deliveries today and earned a PKR ${bonusRecord.bonusAmount} bonus. It has been added to your wallet.`,
                    'bonus',
                    { bonusAmount: bonusRecord.bonusAmount }
                );
                
                triggerEvent(`user-${rider.user._id}`, 'notification', notification);
                triggerEvent(`rider-${riderId}`, 'bonus_achieved', {
                    bonusAmount: bonusRecord.bonusAmount,
                    totalDeliveries: bonusRecord.dailyDeliveryCount
                });
            }
        }
        
        await bonusRecord.save();
        
        // Notify rider about progress update
        triggerEvent(`rider-${riderId}`, 'bonus_progress_updated', {
            dailyDeliveryCount: bonusRecord.dailyDeliveryCount,
            targetDeliveries: bonusRecord.targetDeliveries,
            isBonusAchieved: bonusRecord.isBonusAchieved
        });

        return bonusRecord;
    } catch (error) {
        console.error('Error tracking rider delivery for bonus:', error);
    }
};

/**
 * Get current bonus status for a rider
 */
const getRiderBonusStatus = async (req, res) => {
    try {
        const rider = await Rider.findOne({ user: req.user._id });
        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        let bonusRecord = await RiderBonus.findOne({ rider: rider._id, date: today });
        
        if (!bonusRecord) {
            bonusRecord = {
                dailyDeliveryCount: 0,
                targetDeliveries: 10,
                bonusAmount: 200,
                isBonusAchieved: false
            };
        }
        
        // Also get bonus history
        const history = await RiderBonus.find({ rider: rider._id, isBonusAchieved: true })
            .sort({ date: -1 })
            .limit(10);
            
        res.json({
            current: bonusRecord,
            history: history
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Admin: Get all rider bonus stats
 */
const getAllRiderBonusStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const stats = await RiderBonus.find({ date: today })
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name email phone' }
            });
            
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    trackRiderDeliveryForBonus,
    getRiderBonusStatus,
    getAllRiderBonusStats
};
