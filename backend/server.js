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

// 🚀 0. ENV CHECK
const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
requiredEnv.forEach(env => {
    if (!process.env[env]) {
        console.error(`❌ CRITICAL: Environment variable ${env} is missing!`);
    }
});

// 🚀 1. IMMEDIATE PORT BINDING
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 SERVER IS LIVE ON PORT ${PORT}`);
    });
}

// 🚀 2. HEALTH CHECK (No Middleware to block it)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 3. MIDDLEWARE
app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins in production for now to fix CORS issues, 
        // or you can restrict it to your vercel app URL
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token']
}));

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

// 5. ASYNC INITIALIZATION (Doesn't block server startup)
const initializeApp = async () => {
    try {
        // Init Pusher (Now safe even if keys are missing)
        initSocket();
        
        // DB Connection
        if (process.env.USE_MOCK_DB !== 'true') {
            await connectDB();
            
            // Seeder (Only run in dev, not on Vercel startup to avoid timeouts)
            if (process.env.NODE_ENV !== 'production') {
                require('./seederFunction')().catch(e => console.error('Seeder Error:', e));
            }
        }
    } catch (err) {
        console.error('🔥 Initialization Error:', err);
    }
};

// Start initialization but don't await it here to allow module export
initializeApp();

// Global Error Handlers
process.on('uncaughtException', (err) => console.error('🔥 UNCAUGHT:', err));
process.on('unhandledRejection', (err) => console.error('🔥 UNHANDLED:', err));

module.exports = app;
