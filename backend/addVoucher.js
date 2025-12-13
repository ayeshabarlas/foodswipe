const mongoose = require('mongoose');
const Voucher = require('./models/Voucher');
require('dotenv').config();

const addVoucher = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodswipe');
        console.log('MongoDB connected...');

        // Check if WELCOME20 already exists
        const existing = await Voucher.findOne({ code: 'WELCOME20' });

        if (existing) {
            console.log('WELCOME20 voucher already exists!');
            process.exit(0);
        }

        // Create new voucher
        const newVoucher = await Voucher.create({
            code: 'WELCOME20',
            discount: 20,
            description: 'Get 20% off on your first order! Save Rs. 200 on orders above Rs. 1000',
            expiryDate: new Date('2026-12-31'),
            minimumAmount: 1000,
            isActive: true
        });

        console.log('✅ WELCOME20 voucher added successfully!');
        console.log(`Code: ${newVoucher.code}`);
        console.log(`Discount: ${newVoucher.discount}%`);
        console.log(`Minimum Amount: Rs. ${newVoucher.minimumAmount}`);
        console.log(`Expires: ${newVoucher.expiryDate.toDateString()}`);

        process.exit(0);
    } catch (error) {
        console.error('Error adding voucher:', error);
        process.exit(1);
    }
};

addVoucher();
