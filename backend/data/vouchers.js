const vouchers = [
    {
        code: 'WELCOME10',
        discount: 10,
        description: 'Get 10% off on your first order!',
        expiryDate: new Date('2026-12-31'),
        minimumAmount: 500,
    },
    {
        code: 'WELCOME20',
        discount: 20,
        description: 'Get 20% off on your first order! Save Rs. 200 on orders above Rs. 1000',
        expiryDate: new Date('2026-12-31'),
        minimumAmount: 1000,
    },
    {
        code: 'SAVE20',
        discount: 20,
        description: 'Save 20% on orders above Rs. 1000',
        expiryDate: new Date('2026-06-30'),
        minimumAmount: 1000,
    },
    {
        code: 'FEAST25',
        discount: 25,
        description: 'Enjoy 25% off on weekend feasts!',
        expiryDate: new Date('2025-12-31'),
        minimumAmount: 1500,
    },
    {
        code: 'FLASH15',
        discount: 15,
        description: 'Flash sale! 15% off today only',
        expiryDate: new Date('2025-11-30'),
        minimumAmount: 800,
    },
];

module.exports = vouchers;
