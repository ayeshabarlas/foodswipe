import Constants from 'expo-constants';

/**
 * Mobile App Configuration
 */

// Use your computer's local IP address for local development
// You can find it by running 'ipconfig' on Windows or 'ifconfig' on Mac/Linux
const LOCAL_IP = '172.20.10.11'; // Updated to match your new IP (172.20.10.11)
const RENDER_URL = 'https://foodswipe-6178.onrender.com';

const getBaseUrl = () => {
  // If we're in production, use the production URL
  if (!__DEV__) {
    return RENDER_URL;
  }

  // Priority 1: Use the host IP from Expo (best for physical devices)
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(':').shift();

  if (localhost && localhost !== 'localhost' && localhost !== '127.0.0.1') {
    console.log('📡 Mobile connecting to:', `http://${localhost}:5000`);
    return `http://${localhost}:5000`;
  }

  // Priority 2: Fallback to your specific machine IP
  return `http://${LOCAL_IP}:5000`;
};

export const API_URL = getBaseUrl();
export const SOCKET_URL = getBaseUrl();

/**
 * Formats a media path (image/video) to a full URL
 * @param path The relative path from the backend (e.g., /uploads/file.jpg)
 */
export const getMediaUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
};

export default {
  API_URL,
  SOCKET_URL,
  getMediaUrl,
};
