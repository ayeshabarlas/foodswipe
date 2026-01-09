import Pusher from 'pusher-js';

let pusher: Pusher | null = null;
let activeChannels: Set<string> = new Set();

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2';

export const initSocket = (userId: string, role: string, restaurantId?: string, riderId?: string) => {
    if (!pusher) {
        pusher = new Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
        });
        console.log('✅ Pusher Client initialized');
    }

    // Subscribe to channels based on role (replacing rooms)
    if (role === 'admin') {
        subscribeToChannel('admin');
    } else if (role === 'restaurant' && restaurantId) {
        subscribeToChannel(`restaurant-${restaurantId}`);
    } else if (role === 'rider' && riderId) {
        subscribeToChannel(`rider-${riderId}`);
        subscribeToChannel('riders');
    } else if (userId) {
        subscribeToChannel(`user-${userId}`);
    }

    return pusher;
};

export const subscribeToChannel = (channelName: string) => {
    if (!pusher || activeChannels.has(channelName)) return null;
    
    const channel = pusher.subscribe(channelName);
    activeChannels.add(channelName);
    console.log(`📡 Subscribed to channel: ${channelName}`);
    return channel;
};

export const unsubscribeFromChannel = (channelName: string) => {
    if (!pusher || !activeChannels.has(channelName)) return;
    
    pusher.unsubscribe(channelName);
    activeChannels.delete(channelName);
    console.log(`🚫 Unsubscribed from channel: ${channelName}`);
};

export const getSocket = () => {
    return pusher;
};

export const disconnectSocket = () => {
    if (pusher) {
        activeChannels.forEach(channel => pusher?.unsubscribe(channel));
        activeChannels.clear();
        pusher.disconnect();
        pusher = null;
    }
};
