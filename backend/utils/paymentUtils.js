/**
 * Rider Payment System Calculation Logic
 * Based on Tech Spec: Rs 60 Base Pay + Rs 20/km
 */

// 1. Core Rules
const BASE_RIDER_PAY = 60;
const PER_KM_RATE = 20;

/**
 * Calculates rider earnings based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @returns {object} - grossEarning, platformFee (0), netEarning
 */
const calculateRiderEarning = (distanceKm) => {
    const gross = BASE_RIDER_PAY + (distanceKm * PER_KM_RATE);
    // In this new logic, we don't subtract platform fee from rider
    // Rider gets exactly Base + Distance
    const net = gross; 
    
    return {
        grossEarning: Math.round(gross),
        platformFee: 0,
        netEarning: Math.round(net)
    };
};

/**
 * Calculates delivery fee for the customer based on distance tiers
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} - Delivery fee in Rs.
 */
const calculateDeliveryFee = (distanceKm) => {
    if (distanceKm < 3) return 79;
    if (distanceKm < 6) return 99;
    if (distanceKm < 9) return 129;
    return 149;
};

module.exports = {
    calculateRiderEarning,
    calculateDeliveryFee
};
