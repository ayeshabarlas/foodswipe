import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = 'foodswipe_cache_';
const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

export const setCache = async (key: string, data: any) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
  } catch (err) {
    console.error('Error setting cache:', err);
  }
};

export const getCache = async (key: string) => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CACHE_EXPIRY;

    // Even if expired, we might want to return it if offline
    const netInfo = await NetInfo.fetch();
    if (isExpired && netInfo.isConnected) {
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error getting cache:', err);
    return null;
  }
};

export const clearCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (err) {
    console.error('Error clearing cache:', err);
  }
};

const OFFLINE_QUEUE_KEY = 'foodswipe_offline_queue';

export const queueOfflineAction = async (action: { type: string; payload: any; endpoint: string; method: string }) => {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ ...action, id: Date.now().toString() });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log(`📦 Action queued offline: ${action.type}`);
  } catch (err) {
    console.error('Error queuing offline action:', err);
  }
};

export const processOfflineQueue = async (apiClient: any) => {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueJson) return;

    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;

    console.log(`🔄 Processing ${queue.length} offline actions...`);
    
    const remainingQueue = [];
    for (const action of queue) {
      try {
        const { method, endpoint, payload } = action;
        if (method === 'POST') await apiClient.post(endpoint, payload);
        else if (method === 'PUT') await apiClient.put(endpoint, payload);
        else if (method === 'DELETE') await apiClient.delete(endpoint);
        
        console.log(`✅ Offline action synced: ${action.type}`);
      } catch (err) {
        console.error(`❌ Failed to sync action: ${action.type}`, err);
        remainingQueue.push(action);
      }
    }

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch (err) {
    console.error('Error processing offline queue:', err);
  }
};
