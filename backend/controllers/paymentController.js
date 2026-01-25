const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/Order');
const Settings = require('../models/Settings');

// @desc    Create Safepay Checkout Session
// @route   POST /api/payments/safepay/checkout
// @access  Private
const createSafepaySession = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId).populate('user');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Get system settings
        const settings = await Settings.findOne();
        
        const API_KEY = process.env.SAFEPAY_API_KEY;
        const ENVIRONMENT = settings?.safepay?.environment || process.env.SAFEPAY_ENVIRONMENT || 'sandbox';
        
        const BASE_API_URL = ENVIRONMENT === 'production' 
            ? 'https://api.getsafepay.com' 
            : 'https://sandbox.api.getsafepay.com';
            
        console.log(`[Safepay] Initiating for order: ${orderId}, Amount: ${order.totalPrice}, Environment: ${ENVIRONMENT}`);

        let FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        // Use request origin for localhost testing if available
        if (req.get('origin') && req.get('origin').includes('localhost')) {
            FRONTEND_URL = req.get('origin');
            console.log(`[Safepay] Using localhost FRONTEND_URL: ${FRONTEND_URL}`);
        }
        
        if (!API_KEY) {
            return res.status(500).json({ message: 'Safepay API Key not configured' });
        }

        // STEP 1: Create a tracker (session) with Safepay
        try {
            console.log(`[Safepay] Calling ${BASE_API_URL}/order/v1/init...`);
            
            // Prepare customer data if available
            const customerData = {};
            if (order.user) {
                customerData.customer_email = order.user.email;
                customerData.customer_name = order.user.name;
                // Clean phone number: remove non-digits, leading 92 and leading 0
                // Safepay modal adds +92 automatically, so we only need the 10-digit local part
                if (order.user.phone) {
                    let mobile = order.user.phone.replace(/\D/g, '');
                    if (mobile.startsWith('92')) {
                        mobile = mobile.substring(2);
                    }
                    mobile = mobile.replace(/^0+/, '');
                    customerData.customer_mobile = mobile;
                }
            }

            const safepayRes = await axios.post(`${BASE_API_URL}/order/v1/init`, {
                client: API_KEY,
                amount: Number(order.totalPrice),
                currency: 'PKR',
                environment: ENVIRONMENT,
                mode: 'instrument',
                transaction_type: 'sale',
                ...customerData
            });

            if (safepayRes.data && safepayRes.data.data && safepayRes.data.data.token) {
                const tracker = safepayRes.data.data.token;
                console.log(`[Safepay] Token received: ${tracker}`);
                
                // STEP 2: Construct the redirect URL using the tracker (beacon)
                // Note: Safepay checkout URL (Using /components as per official integration gist)
                // We simplify the URLs so Safepay can append its own parameters (tracker, sig, order_id)
                const checkoutUrl = `${BASE_API_URL}/components?beacon=${tracker}&env=${ENVIRONMENT}&order_id=${order._id}&source=custom&success_url=${FRONTEND_URL}/payment-success&redirect_url=${FRONTEND_URL}/payment-success&cancel_url=${FRONTEND_URL}/payment-cancel`;
                
                return res.json({ url: checkoutUrl });
            } else {
                console.error('[Safepay] Unexpected response structure:', safepayRes.data);
                throw new Error('Failed to get token from Safepay');
            }
        } catch (apiError) {
            console.error('Safepay API Init Error:', apiError.response?.data || apiError.message);
            // Fallback to direct URL if API call fails
            const checkoutUrl = `${BASE_API_URL}/components?vkey=${API_KEY}&amount=${order.totalPrice}&currency=PKR&environment=${ENVIRONMENT}&order_id=${order._id}&source=custom&success_url=${FRONTEND_URL}/payment-success&redirect_url=${FRONTEND_URL}/payment-success&cancel_url=${FRONTEND_URL}/payment-cancel`;
            console.log(`[Safepay] Falling back to direct URL: ${checkoutUrl}`);
            res.json({ url: checkoutUrl });
        }
    } catch (error) {
        console.error('Safepay session error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Safepay Payment
// @route   POST /api/payments/safepay/verify
// @access  Public
const verifySafepayPayment = async (req, res) => {
    try {
        const { order_id, tracker, sig } = req.body;
        
        if (!order_id || !tracker || !sig) {
            return res.status(400).json({ message: 'Missing required payment verification data' });
        }

        // Verify the signature
        const secret = process.env.SAFEPAY_SECRET_KEY;
        if (!secret) {
            console.error('SAFEPAY_SECRET_KEY not found in environment');
            // In sandbox, we might proceed if secret is missing, but better to fail
            return res.status(500).json({ message: 'Payment server configuration error' });
        }

        // Safepay v1 verification logic: HMAC-SHA256 of the tracker
        const expectedSig = crypto
            .createHmac('sha256', secret)
            .update(tracker)
            .digest('hex');

        if (sig !== expectedSig) {
            console.error('Invalid Safepay signature:', { received: sig, expected: expectedSig });
            return res.status(401).json({ message: 'Invalid payment signature' });
        }
        
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update order status
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentResult = {
            id: tracker,
            status: 'completed',
            update_time: new Date().toISOString(),
            signature: sig
        };
        
        // If it was a JazzCash/EasyPaisa order, we can also set the transactionId to the tracker
        const method = order.paymentMethod?.toLowerCase();
        if (method === 'jazzcash' || method === 'easypaisa' || method === 'card') {
            order.transactionId = tracker;
        }

        await order.save();

        res.json({ message: 'Payment verified and order updated' });
    } catch (error) {
        console.error('Safepay verification error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSafepaySession,
    verifySafepayPayment
};
