/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import Pusher from 'pusher-js';

// Initialize these as null/empty and only use them inside functions
let pusher: any = null;
let activeChannels: Set<string> | null = null;
let eventListeners: Map<string, Set<SocketCallback>> | null = null;

function getPusherKey() { return process.env.NEXT_PUBLIC_PUSHER_KEY || ''; }
function getPusherCluster() { return process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2'; }

function getActiveChannels() {
    if (!activeChannels) activeChannels = new Set();
    return activeChannels;
}

function getEventListeners() {
    if (!eventListeners) eventListeners = new Map();
    return eventListeners;
}

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
            const listeners = getEventListeners();
            if (!listeners.has(event)) {
                listeners.set(event, new Set());
            }
            listeners.get(event)?.add(callback);

            getActiveChannels().forEach(channelName => {
                const channel = pusher?.channel(channelName);
                if (channel) channel.bind(event, callback);
            });
        },
        off: (event: string, callback?: (data: any) => void) => {
            const listeners = getEventListeners();
            if (callback) {
                listeners.get(event)?.delete(callback);
                getActiveChannels().forEach(channelName => {
                    const channel = pusher?.channel(channelName);
                    if (channel) channel.unbind(event, callback);
                });
            } else {
                const eventCallbacks = listeners.get(event);
                if (eventCallbacks) {
                    getActiveChannels().forEach(channelName => {
                        const channel = pusher?.channel(channelName);
                        if (channel) {
                            eventCallbacks.forEach(cb => channel.unbind(event, cb));
                        }
                    });
                    listeners.delete(event);
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
    
    const channels = getActiveChannels();
    // If already subscribed, return the existing channel
    if (channels.has(channelName)) {
        return pusher.channel(channelName);
    }
    
    const channel = pusher.subscribe(channelName);
    channels.add(channelName);
    console.log(`📡 Subscribed to channel: ${channelName}`);

    // Automatically bind existing listeners to this new channel
    getEventListeners().forEach((callbacks, event) => {
        callbacks.forEach(callback => {
            channel.bind(event, callback);
        });
    });

    return channel;
}

export function unsubscribeFromChannel(channelName: string) {
    const channels = getActiveChannels();
    if (!pusher || !channels.has(channelName)) return;
    
    pusher.unsubscribe(channelName);
    channels.delete(channelName);
    console.log(`🚫 Unsubscribed from channel: ${channelName}`);
}

export function disconnectSocket() {
    if (pusher) {
        const channels = getActiveChannels();
        channels.forEach(channel => {
            pusher?.unsubscribe(channel);
        });
        channels.clear();
    }
}
