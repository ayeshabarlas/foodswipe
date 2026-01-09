const socketIO = require('socket.io');
const Message = require('./models/Message');

let io;

const initSocket = (server) => {
    const allowedOrigins = (() => {
        const origins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://foodswipe-one.vercel.app',
            'https://foodswipeadmin.vercel.app',
            'https://foodswipe-admin.vercel.app'
        ];
        if (process.env.FRONTEND_URLS) {
            process.env.FRONTEND_URLS.split(',').map(s => s.trim()).filter(Boolean).forEach(o => origins.push(o));
        }
        if (process.env.FRONTEND_URL) {
            origins.push(process.env.FRONTEND_URL);
        }
        return [...new Set(origins)];
    })();

    io = socketIO(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('✅ Client connected:', socket.id);

        // Join room based on user role
        socket.on('join', (data) => {
            const { userId, role, restaurantId, riderId } = data;

            if (role === 'admin') {
                socket.join('admin');
                console.log(`Admin ${userId} joined room`);
            } else if (role === 'restaurant' && restaurantId) {
                socket.join(`restaurant_${restaurantId}`);
                console.log(`Restaurant ${restaurantId} joined room`);
            } else if (role === 'rider' && riderId) {
                socket.join(`rider_${riderId}`);
                socket.join('riders'); // All riders room
                console.log(`Rider ${riderId} joined rooms`);
            } else if (userId) {
                socket.join(`user_${userId}`);
                console.log(`User ${userId} joined room`);
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });

        // 💬 Order Chat System
        socket.on('sendOrderMessage', async (data) => {
            const { orderId, message } = data;
            console.log(`💬 Message in Order ${orderId}:`, message.text);

            try {
                // Save to database
                const newMessage = await Message.create({
                    order: orderId,
                    sender: message.senderId, // Need to make sure senderId is passed
                    senderRole: message.sender,
                    senderName: message.senderName,
                    text: message.text
                });

                // Broadcast to everyone in the order room except the sender
                // Use the saved message data to ensure consistency (like timestamp)
                socket.to(`order_${orderId}`).emit('orderMessage', { 
                    orderId, 
                    message: {
                        ...message,
                        id: newMessage._id,
                        createdAt: newMessage.createdAt
                    } 
                });
            } catch (error) {
                console.error('Error saving socket message:', error);
            }
        });

        // Join specific order room for chat
        socket.on('joinOrderChat', (data) => {
            const { orderId } = data;
            socket.join(`order_${orderId}`);
            console.log(`👤 Client joined chat for order: ${orderId}`);
        });

        // 📍 Real-time Tracking
        socket.on('updateRiderLocation', (data) => {
            const { orderId, location } = data;
            console.log(`📍 Rider location update for order ${orderId}:`, location);
            // Broadcast to the order room (customer/restaurant)
            io.to(`order_${orderId}`).emit('riderLocationUpdate', { orderId, location });
        });

        socket.on('updateOrderStatus', (data) => {
            const { orderId, status } = data;
            console.log(`🔄 Order status update for order ${orderId}:`, status);
            // Broadcast to the order room
            io.to(`order_${orderId}`).emit('orderStatusUpdate', { _id: orderId, status });
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initSocket, getIO };
