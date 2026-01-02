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
const PORT = process.env.PORT || 8080;

console.log('--- 🚀 FOODSWIPE BACKEND STARTING ---');
console.log('PORT:', PORT);

// 1. MIDDLEWARE FIRST
app.use(cors({
    origin: true, // Allow all origins for debugging
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. BASIC ROUTES
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.send('Foodswipe API is Live and Running!'));

// 3. API ROUTES
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

// 4. STARTUP LOGIC
const startServer = async () => {
    try {
        // Initialize Socket.io
        const io = initSocket(server);
        app.set('io', io);

        // Connect to DB (don't block server start)
        if (process.env.USE_MOCK_DB !== 'true') {
            connectDB().then(connected => {
                if (connected) {
                    console.log('✅ MongoDB Connected');
                    require('./seederFunction')().catch(err => console.error('Seeder Error:', err));
                }
            });
        }

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 SERVER IS LIVE ON PORT ${PORT}`);
        });
    } catch (err) {
        console.error('🔥 Startup Error:', err);
    }
};

startServer();

module.exports = { io: () => app.get('io') };
