/**
 * Rider Payment System Calculation Logic
 * Based on Tech Spec: Rs 60 Base Pay + Rs 20/km
 */

// 1. Core Rules
const BASE_RIDER_PAY = 60;
const PER_KM_RATE = 20;
const MAX_RIDER_PAY = 200; // Added cap to prevent inflated earnings (matched with settings default)

/**
 * Calculates rider earnings based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @returns {object} - grossEarning, platformFee (0), netEarning
 */
const calculateRiderEarning = (distanceKm) => {
    let gross = BASE_RIDER_PAY + (distanceKm * PER_KM_RATE);
    
    // Cap the earnings to prevent extreme cases (e.g. 100km distance)
    if (gross > MAX_RIDER_PAY) {
        gross = MAX_RIDER_PAY;
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
 * MVP Logic: Customer pays exactly what the rider gets (Rs 60 Base + Rs 20/km)
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} - Delivery fee in Rs.
 */
const calculateDeliveryFee = (distanceKm) => {
    // Ensuring it matches calculateRiderEarning's gross logic
    let fee = BASE_RIDER_PAY + (distanceKm * PER_KM_RATE);
    
    // Cap the delivery fee to match rider pay cap
    if (fee > MAX_RIDER_PAY) {
        fee = MAX_RIDER_PAY;
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
