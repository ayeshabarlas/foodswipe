const cron = require('node-cron');
const RiderBonus = require('./models/RiderBonus');
const Rider = require('./models/Rider');

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
    // 1. Daily Bonus Reset at Midnight
    // Reset delivery count to 0 at midnight if less than 10 deliveries are completed
    // Actually, our schema is date-based, so we just need to ensure new records are created for the new day.
    // However, the requirement says "resets delivery count to 0 at midnight if less than 10 deliveries are completed".
    // Our logic handles this naturally by creating a new record for each day.
    // We can use this cron to log or perform cleanup if needed.
    cron.schedule('0 0 * * *', async () => {
        console.log('🕛 Midnight: Resetting daily delivery counts for bonus system...');
        const today = new Date().toISOString().split('T')[0];
        
        try {
            // Find all active riders and ensure they have a record for today
            const riders = await Rider.find({ isOnline: true });
            for (const rider of riders) {
                await RiderBonus.findOneAndUpdate(
                    { rider: rider._id, date: today },
                    { 
                        $setOnInsert: { 
                            dailyDeliveryCount: 0,
                            targetDeliveries: 10,
                            bonusAmount: 200,
                            isBonusAchieved: false
                        } 
                    },
                    { upsert: true }
                );
            }
            console.log('✅ Daily bonus reset complete.');
        } catch (error) {
            console.error('❌ Error during daily bonus reset:', error);
        }
    });

    console.log('⏰ Cron jobs initialized.');
};

module.exports = { initCronJobs };
