/**
 * Rider Payment System Calculation Logic
 * Based on Tech Spec provided by user
 */

// 1. Core Rules
const BASE_PAY = Number(process.env.BASE_RIDER_PAY) || 100;
const PER_KM_RATE = Number(process.env.PER_KM_RATE) || 20;
const PLATFORM_FEE = Number(process.env.PLATFORM_FEE) || 15; // fixed, per order

/**
 * Calculates rider earnings based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @returns {object} - grossEarning, platformFee, netEarning
 */
const calculateRiderEarning = (distanceKm) => {
    const gross = BASE_PAY + (distanceKm * PER_KM_RATE);
    const net = gross - PLATFORM_FEE;
    
    return {
        grossEarning: Math.round(gross),
        platformFee: PLATFORM_FEE,
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
