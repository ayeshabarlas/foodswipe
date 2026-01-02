const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
    const allowedOrigins = (() => {
        const origins = ['http://localhost:3000', 'http://localhost:3001', 'https://foodswipe-one.vercel.app'];
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
