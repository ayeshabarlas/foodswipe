import Pusher from 'pusher-js';

let pusher: Pusher | null = null;
const activeChannels: Set<string> = new Set();
type SocketCallback = (data: any) => void;

const eventListeners = new Map<string, Set<SocketCallback>>();

function getPusherKey() { return process.env.NEXT_PUBLIC_PUSHER_KEY || ''; }
function getPusherCluster() { return process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2'; }

function createEmptySocket() {
    return {
        on: (_event: string, _callback: (data: any) => void) => {},
        off: (_event: string, _callback?: (data: any) => void) => {},
        emit: (_event: string, _data: any) => {},
        disconnect: () => {},
        subscribe: (_channelName: string) => null,
        unsubscribe: (_channelName: string) => {},
        bind: (_event: string, _callback: (data: any) => void) => {},
        unbind: (_event: string, _callback?: (data: any) => void) => {},
    };
}

function createSocketWrapper() {
    const wrapper = {
        on: (event: string, callback: (data: any) => void) => {
            // Register global listener
            if (!eventListeners.has(event)) {
                eventListeners.set(event, new Set());
            }
            eventListeners.get(event)?.add(callback);

            // Bind to all active channels
            activeChannels.forEach(channelName => {
                const channel = pusher?.channel(channelName);
                if (channel) channel.bind(event, callback);
            });
        },
        off: (event: string, callback?: (data: any) => void) => {
            if (callback) {
                // Remove specific listener
                eventListeners.get(event)?.delete(callback);
                activeChannels.forEach(channelName => {
                    const channel = pusher?.channel(channelName);
                    if (channel) channel.unbind(event, callback);
                });
            } else {
                // Remove all listeners for this event
                const listeners = eventListeners.get(event);
                if (listeners) {
                    activeChannels.forEach(channelName => {
                        const channel = pusher?.channel(channelName);
                        if (channel) {
                            listeners.forEach(cb => channel.unbind(event, cb));
                        }
                    });
                    eventListeners.delete(event);
                }
            }
        },
        emit: (_event: string, _data: any) => {
            console.warn('Socket.emit is not supported in Pusher wrapper');
        },
        disconnect: () => {
            disconnectSocket();
        },
        subscribe: (channelName: string) => subscribeToChannel(channelName),
        unsubscribe: (channelName: string) => unsubscribeFromChannel(channelName),
        bind: (event: string, callback: (data: any) => void) => {
            wrapper.on(event, callback);
        },
        unbind: (event: string, callback?: (data: any) => void) => {
            wrapper.off(event, callback);
        },
    };
    return wrapper;
}

export function initSocket(userId: string, role: string, restaurantId?: string, riderId?: string) {
    // Return dummy socket for server-side rendering
    if (typeof window === 'undefined') return createEmptySocket();

    const key = getPusherKey();
    // Check if Pusher is configured
    if (!key) {
        console.warn('⚠️ Pusher Key is missing, skipping socket initialization');
        return createEmptySocket();
    }

    if (!pusher) {
        try {
            pusher = new Pusher(key, {
                cluster: getPusherCluster(),
            });
            console.log('✅ Pusher Client initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Pusher:', error);
            return createEmptySocket();
        }
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
}

export function getSocket() {
    if (!pusher) return createEmptySocket();
    return createSocketWrapper();
}

export function subscribeToChannel(channelName: string) {
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
}

export function unsubscribeFromChannel(channelName: string) {
    if (!pusher || !activeChannels.has(channelName)) return;
    
    pusher.unsubscribe(channelName);
    activeChannels.delete(channelName);
    console.log(`🚫 Unsubscribed from channel: ${channelName}`);
}

export function disconnectSocket() {
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
}
