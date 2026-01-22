/**
 * Rider Payment System Calculation Logic
 * Based on Tech Spec: Rs 60 Base Pay + Rs 20/km
 */

// 1. Core Rules
const BASE_RIDER_PAY = 40;
const PER_KM_RATE = 20;
const MAX_RIDER_PAY = 200; // Added cap to prevent inflated earnings (matched with settings default)

/**
 * Calculates rider earnings based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @param {object} settings - Optional system settings to use for rates
 * @returns {object} - grossEarning, platformFee (0), netEarning
 */
const calculateRiderEarning = (distanceKm, settings = null) => {
    const basePay = settings?.deliveryFeeBase || BASE_RIDER_PAY;
    const perKmRate = settings?.deliveryFeePerKm || PER_KM_RATE;
    const maxPay = settings?.deliveryFeeMax || MAX_RIDER_PAY;

    let gross = basePay + (distanceKm * perKmRate);
    
    // Cap the earnings to prevent extreme cases
    if (gross > maxPay) {
        gross = maxPay;
    }

    const net = gross; 
    
    return {
        grossEarning: Math.round(gross),
        platformFee: 0,
        netEarning: Math.round(net)
    };
};

/**
 * Calculates delivery fee for the customer
 * @param {number} distanceKm - Distance in kilometers
 * @param {object} settings - Optional system settings to use for rates
 * @returns {number} - Delivery fee in Rs.
 */
const calculateDeliveryFee = (distanceKm, settings = null) => {
    const basePay = settings?.deliveryFeeBase || BASE_RIDER_PAY;
    const perKmRate = settings?.deliveryFeePerKm || PER_KM_RATE;
    const maxPay = settings?.deliveryFeeMax || MAX_RIDER_PAY;

    let fee = basePay + (distanceKm * perKmRate);
    
    // Cap the delivery fee
    if (fee > maxPay) {
        fee = maxPay;
    }
    
    return Math.round(fee);
};

/**
 * Updates rider earnings and stats, handling date-based resets for today/week/month
 * @param {object} rider - The rider document
 * @param {number} earningAmount - The amount to add to earnings
 * @returns {object} - Updated rider document
 */
const updateRiderEarningsWithReset = (rider, earningAmount) => {
    const now = new Date();
    const lastUpdate = rider.updatedAt ? new Date(rider.updatedAt) : new Date();

    if (!rider.earnings) {
        rider.earnings = { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };
    }

    // 1. Reset check: Today
    const isSameDay = now.getDate() === lastUpdate.getDate() &&
                     now.getMonth() === lastUpdate.getMonth() &&
                     now.getFullYear() === lastUpdate.getFullYear();
    
    if (!isSameDay) {
        console.log(`[Finance] Resetting today's earnings for ${rider.fullName}`);
        rider.earnings.today = 0;
    }

    // 2. Reset check: This Week (Assuming week starts on Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    if (lastUpdate < startOfWeek) {
        console.log(`[Finance] Resetting weekly earnings for ${rider.fullName}`);
        rider.earnings.thisWeek = 0;
    }

    // 3. Reset check: This Month
    const isSameMonth = now.getMonth() === lastUpdate.getMonth() &&
                       now.getFullYear() === lastUpdate.getFullYear();
    
    if (!isSameMonth) {
        console.log(`[Finance] Resetting monthly earnings for ${rider.fullName}`);
        rider.earnings.thisMonth = 0;
    }

    // 4. Apply Earnings
    rider.walletBalance = (rider.walletBalance || 0) + earningAmount;
    rider.earnings_balance = (rider.earnings_balance || 0) + earningAmount;
    rider.earnings.total = (rider.earnings.total || 0) + earningAmount;
    rider.earnings.today = (rider.earnings.today || 0) + earningAmount;
    rider.earnings.thisWeek = (rider.earnings.thisWeek || 0) + earningAmount;
    rider.earnings.thisMonth = (rider.earnings.thisMonth || 0) + earningAmount;

    return rider;
};

module.exports = {
    calculateRiderEarning,
    calculateDeliveryFee,
    updateRiderEarningsWithReset
};
