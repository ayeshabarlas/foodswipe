// Server.js - Render Deployment Fix - v2.2.45-FINAL-LOGIN-FIX
const express = require('express');
const path = require('path');

console.log('🚀 Backend Server Starting v2.2.45-FINAL-LOGIN-FIX...');

// Load environment variables
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const cors = require('cors');
const { initSocket } = require('./socket');
const { initCronJobs } = require('./cronTasks');
const { connectDB, getDbStatus } = require('./config/db');

const app = express();

// 🚀 1. REQUEST LOGGING (Moved to top)
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 🚀 2. CORS & MIDDLEWARE
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

// 🚀 3. HEALTH
// Force deployment trigger - v2.2.39 - 2026-01-30 09:50
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
        version: '2.2.43-DOMAIN-FIX', // Updated version
        env: process.env.NODE_ENV,
        render: !!process.env.RENDER,
        vercel: !!process.env.VERCEL || !!process.env.NOW_REGION || !!process.env.VERCEL_URL
    });
});

// API Root Info
app.get('/api', (req, res) => {
    res.status(200).json({ message: 'Foodswipe API is Live', version: '2.2.43' });
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
    app.use('/api/bonus', require('./routes/bonusRoutes'));
    app.use('/api/notifications', require('./routes/notificationRoutes'));
    app.use('/api/admin', require('./routes/adminRoutes'));
    app.use('/api/finance', require('./routes/financeRoutes'));
    app.use('/api/payments', require('./routes/paymentRoutes'));
    app.use('/api/verifications', require('./routes/verificationRoutes'));
    app.use('/api/tickets', require('./routes/ticketRoutes'));
    app.use('/api/settings', require('./routes/settingsRoutes'));
    app.use('/api/pusher', require('./routes/pusherRoutes'));
    console.log('✅ All Routes Loaded');
} catch (routeErr) {
    console.error('🔥 ROUTE LOADING ERROR:', routeErr.message);
}

// 🚀 5. STATIC FILES & FRONTEND ROUTING
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend in production (Fixes 404 for non-Vercel platforms)
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_STATIC_URL || process.env.RENDER || true) {
    const frontendPath = path.join(__dirname, '../frontend/out');
    console.log(`🔍 Checking for frontend at: ${frontendPath}`);
    
    if (require('fs').existsSync(frontendPath)) {
        console.log('✅ Frontend "out" directory found, serving static files');
        
        // Serve static files with extensions first
        app.use(express.static(frontendPath, {
            extensions: ['html', 'htm'],
            index: 'index.html'
        }));

        // Catch-all route to serve index.html for SPA routing
        app.get('*', (req, res) => {
            // Don't intercept API or Uploads
            if (!req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
                // SPECIAL CASE: If URL contains /admin, try to serve admin pages specifically
                if (req.url.startsWith('/admin')) {
                    const adminIndex = path.join(frontendPath, 'admin.html');
                    const adminDirIndex = path.join(frontendPath, 'admin/index.html');
                    
                    if (require('fs').existsSync(adminIndex)) {
                        console.log(`👑 Serving admin.html for: ${req.url}`);
                        return res.sendFile(adminIndex);
                    } else if (require('fs').existsSync(adminDirIndex)) {
                        console.log(`👑 Serving admin/index.html for: ${req.url}`);
                        return res.sendFile(adminDirIndex);
                    }
                }

                // Default fallback for other routes
                const indexPath = path.join(frontendPath, 'index.html');
                if (require('fs').existsSync(indexPath)) {
                    return res.sendFile(indexPath);
                }
            }
        });
    } else {
        console.log('❌ Frontend "out" directory NOT found at ' + frontendPath);
        // Fallback for development if "out" isn't there but we want to know why
        app.get('/', (req, res) => {
            res.status(200).json({ 
                message: 'Foodswipe API is Live', 
                frontend: 'Not Built (out directory missing)',
                path: frontendPath
            });
        });
    }
}

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
        // Connect to DB for all environments
        console.log('🔌 Connecting to MongoDB...');
        const success = await connectDB();
        
        // Only start crons and sockets in non-Vercel environments
        // or during actual server runtime (not during build)
        if (!process.env.VERCEL) {
            console.log('🔌 Initializing Pusher...');
            initSocket();
            
            console.log('⏰ Initializing Cron Jobs...');
            initCronJobs();
            
            if (success) {
                console.log('✅ DB Connected Successfully');
                const PORT = process.env.PORT || 10000;
                app.listen(PORT, '0.0.0.0', () => {
                    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
                    console.log(`📡 Health Check: http://localhost:${PORT}/health`);
                });
            } else {
                console.error('❌ CRITICAL: DB Connection Failed.');
                const PORT = process.env.PORT || 10000;
                app.listen(PORT, '0.0.0.0', () => {
                    console.log(`🚀 SERVER RUNNING ON PORT ${PORT} (LIMITED MODE - NO DB)`);
                });
            }
        } else {
            // Vercel environment: just ensure DB is connected for the serverless function
            if (success) {
                console.log('✅ Vercel DB Connection Ready');
            } else {
                console.warn('⚠️ Vercel DB Connection Pending/Failed');
            }
            // Initialize Pusher lazily if needed, but don't start cron jobs
            initSocket();
        }
    } catch (err) {
        console.error('🔥 STARTUP ERROR:', err);
    }
};

startServer();

module.exports = app;
