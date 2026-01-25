import Pusher from 'pusher-js';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

// Pusher credentials from backend
const PUSHER_KEY = 'da46db736ed954bbd03c';
const PUSHER_CLUSTER = 'ap2';

let pusher: Pusher | null = null;
const activeChannels = new Set<string>();

export const subscribeToChannel = (channelName: string) => {
  if (!pusher) {
    console.log('🔌 Pusher not initialized. Initializing guest connection...');
    initializePusher();
  }
  
  if (activeChannels.has(channelName)) {
    return pusher?.channel(channelName);
  }

  const channel = pusher?.subscribe(channelName);
  if (channel) activeChannels.add(channelName);
  console.log(`📡 Subscribed to channel: ${channelName}`);
  return channel;
};

const initializePusher = async () => {
  if (pusher) return pusher;

  const token = await SecureStore.getItemAsync('auth_token');
  
  pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    authEndpoint: `${API_URL}/api/pusher/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return pusher;
};

export const initSocket = async (userId: string, role: string) => {
  if (!pusher) {
    await initializePusher();
  }

  console.log(`✅ Pusher initialized for ${role}: ${userId}`);

  // Auto-subscribe to personal user channel
  subscribeToChannel(`user-${userId}`);

  // Subscribe to role-based channels
  if (role === 'rider') {
    subscribeToChannel('riders');
  }

  return pusher;
};

export const unsubscribeFromChannel = (channelName: string) => {
  if (!pusher || !activeChannels.has(channelName)) return;

  pusher.unsubscribe(channelName);
  activeChannels.delete(channelName);
  console.log(`🚫 Unsubscribed from channel: ${channelName}`);
};

export const getSocket = () => pusher;

export const disconnectSocket = () => {
  if (pusher) {
    activeChannels.forEach(channel => pusher?.unsubscribe(channel));
    pusher.disconnect();
    pusher = null;
    activeChannels.clear();
    console.log('🔌 Pusher disconnected');
  }
};
