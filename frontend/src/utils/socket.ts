import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;

export const initSocket = (userId: string, role: string, restaurantId?: string, riderId?: string) => {
    if (socket && socket.connected) {
        return socket;
    }

    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
        console.log('✅ Socket connected:', socket?.id);

        // Join appropriate rooms based on role
        socket?.emit('join', {
            userId,
            role,
            restaurantId,
            riderId
        });
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    return socket;
};

export const getSocket = () => {
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
