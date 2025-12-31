const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

// EMERGENCY START: Listen immediately
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EMERGENCY START: Server listening on port ${PORT}`);
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', emergency: true });
});

const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const path = require('path');
const { initSocket } = require('./socket');

dotenv.config();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.send('Foodswipe API is running...');
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString() 
    });
});

// Define API Routes
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

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

const PORT = process.env.PORT || 8080;

const startServer = async () => {
    console.log('🚀 Starting Server Initialization...');
    
    // 1. Try to connect to DB first, but don't block forever
    let dbConnected = false;
    if (process.env.USE_MOCK_DB !== 'true') {
        try {
            console.log('⏳ Connecting to MongoDB...');
            dbConnected = await connectDB();
            if (dbConnected) {
                console.log('✅ DB Connected. Running Seeder...');
                // Run seeder but don't let it block the server start if it's slow
                require('./seederFunction')().catch(err => console.error('Seeder failed:', err));
            }
        } catch (err) {
            console.error('❌ DB Connection failed during startup:', err.message);
        }
    } else {
        console.log('💡 Using Mock Database');
    }

    // 2. We already started the server at the top
    console.log(`💡 Initialization complete. Server should be responding on ${PORT}`);
};

startServer();

module.exports = { io };
