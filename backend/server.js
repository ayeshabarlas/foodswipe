const express = require('express');
const path = require('path');

console.log('🚀 Backend Server Starting...');

// Load environment variables
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const cors = require('cors');
const { initSocket } = require('./socket');
const { connectDB, getDbStatus } = require('./config/db');

const app = express();

// 🚀 1. CORS & MIDDLEWARE
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://foodswipe-one.vercel.app',
    'https://foodswipe-6178.onrender.com',
    'https://foodswipeadmin.vercel.app',
    'https://foodswipe.pk',
    'https://www.foodswipe.pk'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.indexOf(origin) !== -1 || 
                         origin.endsWith('.vercel.app') || 
                         origin.endsWith('.trae.app');

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.warn(`🚫 CORS Blocked origin: ${origin}`);
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🚀 2. DB CONNECTION CHECK MIDDLEWARE
app.use((req, res, next) => {
    // Skip health check and root to allow them to report status
    if (req.url === '/health' || req.url === '/' || req.url.startsWith('/api/upload')) {
        return next();
    }

    const dbStatus = getDbStatus();
    if (!dbStatus.isConnected) {
        console.warn(`⚠️ Request blocked: Database not connected (${req.method} ${req.url})`);
        return res.status(503).json({
            message: 'Database connection is currently unavailable. Please try again in a few seconds.',
            error: 'DB_NOT_CONNECTED',
            details: dbStatus.lastError
        });
    }
    next();
});

// 🚀 3. REQUEST LOGGING
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 🚀 3. HEALTH & ROOT
// Force deployment trigger - v1.1.0 - 2026-01-21 21:30
app.get('/health', async (req, res) => {
    console.log('💓 Health check requested');
    const dbStatus = getDbStatus();
    
    // Check Firebase
    const firebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || require('fs').existsSync(require('path').resolve(__dirname, './serviceAccountKey.json'));
    let firebaseProjectId = 'not_configured';
    
    if (firebaseConfigured) {
        try {
            if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
                const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
                firebaseProjectId = sa.project_id || 'unknown';
            } else {
                const sa = JSON.parse(require('fs').readFileSync(require('path').resolve(__dirname, './serviceAccountKey.json'), 'utf8'));
                firebaseProjectId = sa.project_id || 'unknown';
            }
        } catch (e) {
            firebaseProjectId = 'parse_error';
        }
    }
    
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
        firebase: firebaseConfigured ? 'configured' : 'missing_env_var',
        firebaseProject: firebaseProjectId,
        timestamp: new Date().toISOString(),
        version: '1.0.9',
        env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL || !!process.env.NOW_REGION || !!process.env.VERCEL_URL
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
    app.use('/api/payments', require('./routes/paymentRoutes'));
    app.use('/api/verifications', require('./routes/verificationRoutes'));
    app.use('/api/tickets', require('./routes/ticketRoutes'));
    app.use('/api/settings', require('./routes/settingsRoutes'));
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

// 🚀 7. INITIALIZE
const startServer = async () => {
    try {
        console.log('🔌 Initializing Pusher...');
        initSocket();
        
        console.log('🔌 Connecting to MongoDB...');
        const success = await connectDB();
        
        if (success) {
            console.log('✅ DB Connected Successfully');
            
            // Start server for non-Vercel environments (Local, Render, etc.)
            if (!process.env.VERCEL) {
                const PORT = process.env.PORT || 10000; // Use 10000 as default for Render/Production
                app.listen(PORT, '0.0.0.0', () => {
                    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
                    console.log(`📡 Health Check: http://localhost:${PORT}/health`);
                });
            }
        } else {
            console.error('❌ CRITICAL: DB Connection Failed.');
            
            // Still start for health reporting
            if (!process.env.VERCEL) {
                const PORT = process.env.PORT || 10000; // Keep port consistent
                app.listen(PORT, '0.0.0.0', () => {
                    console.log(`🚀 SERVER RUNNING ON PORT ${PORT} (LIMITED MODE - NO DB)`);
                });
            }
        }
    } catch (err) {
        console.error('🔥 STARTUP ERROR:', err);
    }
};
 
 startServer();
