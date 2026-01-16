const getApiUrl = () => {
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
    // If we're on a local network IP, use that IP for the backend too
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.endsWith('.trae.app')) {
      return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }

  // Priority 3: Use Render URL as the MAIN production backend
  const RENDER_URL = process.env.NEXT_PUBLIC_API_URL || 'https://foodswipe-6178.onrender.com';
  
  // Force Render URL for specific Vercel production domains
  if (typeof window !== 'undefined' && (
    window.location.hostname === 'foodswipe-one.vercel.app' ||
    window.location.hostname.includes('vercel.app') ||
    process.env.NODE_ENV === 'production'
  )) {
    console.log('🌐 Production Environment: Using Backend', RENDER_URL);
    return RENDER_URL;
  }
  
  // Priority 4: Localhost fallback
  if (!url) {
    url = 'http://localhost:5000';
  }
  
  // Ensure protocol
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  // Strip trailing slash
  url = url.endsWith('/') ? url.slice(0, -1) : url;

  // IMPORTANT: Strip /api from the end if it exists, 
  // because components add /api/ themselves in their axios calls
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  
  return url;
};

const getSocketUrl = () => {
  // Priority 1: Environment variable
  let url = process.env.NEXT_PUBLIC_SOCKET_URL;
  
  // Priority 2: Force localhost/local IP if we are on a local network in browser
  if (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.') ||
    window.location.hostname.endsWith('.trae.app')
  )) {
    // If we're on a local network IP, use that IP for the backend too
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.endsWith('.trae.app')) {
      return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }

  // Override if pointing to old Vercel backend
  if (url && url.includes('vercel.app')) {
    url = 'https://foodswipe-6178.onrender.com';
  }
  
  // Priority 3: Production fallback (Hardcoded Render URL)
  if (!url && process.env.NODE_ENV === 'production') {
    url = 'https://foodswipe-6178.onrender.com';
  }

  // Priority 4: Localhost fallback
  if (!url) {
    url = 'http://localhost:5000';
  }

  // Ensure protocol
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

console.log('🌐 Frontend Config:', { API_BASE_URL, SOCKET_URL });
