import Pusher from 'pusher-js';

let pusher: Pusher | null = null;
let activeChannels: Set<string> = new Set();
const eventListeners = new Map<string, Set<(data: any) => void>>();

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2';

export const initSocket = (userId: string, role: string, restaurantId?: string, riderId?: string) => {
    if (typeof window === 'undefined') return createEmptySocket();

    if (!pusher) {
        if (!PUSHER_KEY) {
            console.error('❌ Pusher Key is missing!');
            return createEmptySocket();
        }
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

    // Return a wrapper that mimics Socket.io API
    return createSocketWrapper();
};

const createEmptySocket = () => ({
    on: () => {},
    off: () => {},
    emit: () => {},
    pusher: null
});

const createSocketWrapper = () => {
    const on = (event: string, callback: (data: any) => void) => {
        // Store listener for future channels
        if (!eventListeners.has(event)) {
            eventListeners.set(event, new Set());
        }
        eventListeners.get(event)?.add(callback);

        // Bind to current active channels
        activeChannels.forEach(channelName => {
            const channel = pusher?.channel(channelName);
            channel?.bind(event, callback);
        });
        
        // Also bind to connection events if it's a Pusher-specific event
        if (['connect', 'disconnect', 'error'].includes(event)) {
            pusher?.connection.bind(event, callback);
        }
    };

    const off = (event: string, callback?: (data: any) => void) => {
        if (callback) {
            eventListeners.get(event)?.delete(callback);
        } else {
            eventListeners.delete(event);
        }

        activeChannels.forEach(channelName => {
            const channel = pusher?.channel(channelName);
            if (callback) {
                channel?.unbind(event, callback);
            } else {
                channel?.unbind(event);
            }
        });
        
        if (['connect', 'disconnect', 'error'].includes(event)) {
            if (callback) {
                pusher?.connection.unbind(event, callback);
            } else {
                pusher?.connection.unbind(event);
            }
        }
    };

    return {
        on,
        off,
        bind: on,
        unbind: off,
        emit: (event: string, data: any) => {
            console.warn(`Socket.emit('${event}') called but Pusher is client-only. Use API instead.`);
        },
        // Original pusher instance if needed
        pusher
    };
};

export const getSocket = () => {
    if (!pusher) return createEmptySocket();
    return createSocketWrapper();
};

export const subscribeToChannel = (channelName: string) => {
    if (!pusher) return null;
    
    // If already subscribed, return the existing channel
    if (activeChannels.has(channelName)) {
        return pusher.channel(channelName);
    }
    
    const channel = pusher.subscribe(channelName);
    activeChannels.add(channelName);
    console.log(`📡 Subscribed to channel: ${channelName}`);

    // Automatically bind existing listeners to this new channel
    eventListeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
            channel.bind(event, callback);
        });
    });

    return channel;
};

export const unsubscribeFromChannel = (channelName: string) => {
    if (!pusher || !activeChannels.has(channelName)) return;
    
    pusher.unsubscribe(channelName);
    activeChannels.delete(channelName);
    console.log(`🚫 Unsubscribed from channel: ${channelName}`);
};

export const disconnectSocket = () => {
    if (pusher) {
        // Just unsubscribe from all channels instead of disconnecting entirely
        // to avoid killing the singleton for other components
        activeChannels.forEach(channel => {
            pusher?.unsubscribe(channel);
        });
        activeChannels.clear();
        // pusher.disconnect(); // Don't disconnect entirely
        // pusher = null;
    }
};
