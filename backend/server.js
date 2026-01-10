console.log('🚀 Backend Server Starting...');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSocket } = require('./socket');
const { connectDB, getDbStatus } = require('./config/db');

const app = express();

// 🚀 1. CORS & MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🚀 2. REQUEST LOGGING
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 🚀 3. HEALTH & ROOT
app.get('/health', async (req, res) => {
    console.log('💓 Health check requested');
    const dbStatus = getDbStatus();
    
    // If not connected, try one more time (lazy connect)
    if (!dbStatus.isConnected) {
        console.log('🔌 DB not connected, retrying...');
        await connectDB();
    }

    const updatedStatus = getDbStatus();
    const statusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    res.status(200).json({ 
        status: 'OK', 
        db: statusMap[updatedStatus.readyState] || 'unknown',
        dbError: updatedStatus.lastError,
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL
    });
});

app.get('/', (req, res) => {
    res.status(200).send('<h1>Foodswipe API is Live and Running!</h1><p>Status: OK</p>');
});

// 🚀 4. API ROUTES
console.log('🛣️ Loading Routes...');
try {
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
    console.log('✅ All Routes Loaded');
} catch (routeErr) {
    console.error('🔥 ROUTE LOADING ERROR:', routeErr.message);
}

// 🚀 5. STATIC FILES
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🚀 6. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error('🔥 SERVER ERROR:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message
    });
});

// 🚀 7. INITIALIZE (Non-blocking)
const startServer = async () => {
    try {
        console.log('🔌 Initializing Pusher...');
        initSocket();
        
        console.log('🔌 Connecting to MongoDB (Non-blocking)...');
        connectDB().then(success => {
            if (success) console.log('✅ DB Connected');
            else console.error('❌ DB Connection Failed - Check MONGO_URI');
        }).catch(err => {
            console.error('🔥 DB Connection Promise Error:', err.message);
        });
    } catch (err) {
        console.error('🔥 Initialization Error:', err);
    }
};

console.log('🚀 Calling startServer()...');
startServer();

// Local server for development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`🚀 LOCAL SERVER ON PORT ${PORT}`);
    });
}

module.exports = app;
