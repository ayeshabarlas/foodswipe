const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect Database
if (process.env.USE_MOCK_DB !== 'true') {
    connectDB().then(() => {
        require('./seederFunction')();
    });
} else {
    console.log('Using Mock Database');
}

// Routes
app.get('/', (req, res) => {
    res.send('Foodswipe API is running...');
});

const http = require('http');
const { initSocket } = require('./socket');

const server = http.createServer(app);
const io = initSocket(server);

// Make io accessible to our router
app.set('io', io);

// Define Routes
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

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { io };
