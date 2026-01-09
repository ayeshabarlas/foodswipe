require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { initSocket } = require('./socket');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 8080;

// 🚀 1. CORS (Must be FIRST)
app.use(cors()); 

// 🚀 2. HEALTH CHECK
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/test', (req, res) => res.json({ message: 'Backend is reachable!' }));

// 🚀 3. MIDDLEWARE
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. API ROUTES
app.get('/', (req, res) => res.send('Foodswipe API is Live and Running!'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/restaurants', require('./routes/restaurantRoutes'));
app.use('/api/dishes', require('./routes/dishRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/vouchers', require('./routes/voucherRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/payouts', require('./routes/payoutRoutes'));
app.use('/api/promotions', require('./routes/promotionRoutes'));
app.use('/api/deals', require('./routes/dealRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/riders', require('./routes/riderRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/verifications', require('./routes/verificationRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

// 🚀 5. GLOBAL ERROR HANDLER (Prevents Crash)
app.use((err, req, res, next) => {
    console.error('🔥 SERVER ERROR:', err.message);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? 'Check server logs' : err.message
    });
});

// 🚀 6. INITIALIZE
const initializeApp = async () => {
    try {
        console.log('⏳ Initializing Backend...');
        
        // ENV CHECK
        if (!process.env.MONGO_URI) console.error('❌ MONGO_URI missing!');
        if (!process.env.JWT_SECRET) console.error('❌ JWT_SECRET missing!');

        // Init Pusher
        initSocket();
        
        // DB Connection
        await connectDB();
        
        console.log('✅ Backend Ready!');
    } catch (err) {
        console.error('🔥 Fatal Initialization Error:', err.message);
    }
};

initializeApp();

// Port binding for local dev
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 SERVER IS LIVE ON PORT ${PORT}`);
    });
}

module.exports = app;
