// Deploy Trigger: 2026-01-24 00:30 - Final Production Sync (Repo Public)
// Lazy-loaded constants to avoid TDZ (Temporal Dead Zone) errors
let cachedApiUrl: string | null = null;
let cachedSocketUrl: string | null = null;

export function getApiUrl() {
  if (cachedApiUrl) return cachedApiUrl;
  
  // Priority 1: Use Environment variable if provided (from .env.local)
  let url = process.env.NEXT_PUBLIC_API_URL;

  // Priority 2: Force localhost/local IP if we are on a local network in browser
  if (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.') ||
    window.location.hostname.endsWith('.trae.app') // Support Trae preview
  )) {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.endsWith('.trae.app')) {
      cachedApiUrl = `http://${window.location.hostname}:5000`;
      return cachedApiUrl;
    }
    cachedApiUrl = 'http://localhost:5000';
    return cachedApiUrl;
  }

  const RENDER_URL = process.env.NEXT_PUBLIC_API_URL || 'https://foodswipe-6178.onrender.com';
  
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.startsWith('192.168.');
                   
    if (!isLocal || window.location.hostname.includes('vercel.app')) {
      cachedApiUrl = RENDER_URL;
      return cachedApiUrl;
    }
  }
  
  if (process.env.NODE_ENV === 'production') {
    cachedApiUrl = RENDER_URL;
    return cachedApiUrl;
  }
  
  if (!url) url = 'http://localhost:5000';
  if (!url.startsWith('http')) url = `https://${url}`;
  
  url = url.endsWith('/') ? url.slice(0, -1) : url;
  if (url.endsWith('/api')) url = url.slice(0, -4);
  
  cachedApiUrl = url;
  return url;
}

export function getSocketUrl() {
  if (cachedSocketUrl) return cachedSocketUrl;

  let url = process.env.NEXT_PUBLIC_SOCKET_URL;
  
  if (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.') ||
    window.location.hostname.endsWith('.trae.app')
  )) {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.endsWith('.trae.app')) {
      cachedSocketUrl = `http://${window.location.hostname}:5000`;
      return cachedSocketUrl;
    }
    cachedSocketUrl = 'http://localhost:5000';
    return cachedSocketUrl;
  }

  if (url && url.includes('vercel.app')) url = 'https://foodswipe-6178.onrender.com';
  if (!url && process.env.NODE_ENV === 'production') url = 'https://foodswipe-6178.onrender.com';
  if (!url) url = 'http://localhost:5000';

  if (!url.startsWith('http')) url = `https://${url}`;
  
  cachedSocketUrl = url;
  return url;
}

// These are now legacy exports to prevent breaking other files, 
// but they call the safe functions
export const API_BASE_URL = 'https://foodswipe-6178.onrender.com'; // Hardcoded for safety in TDZ
export const SOCKET_URL = 'https://foodswipe-6178.onrender.com';   // Hardcoded for safety in TDZ
