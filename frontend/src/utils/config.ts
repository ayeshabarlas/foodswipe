const getApiUrl = () => {
  // Priority 1: Force localhost if we are on localhost in browser
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8080';
  }

  // Priority 2: Use Environment variable if provided
  let url = process.env.NEXT_PUBLIC_API_URL;

  // Priority 3: Vercel Monorepo Support
  // If we are on Vercel, and NO explicit API URL is provided, 
  // we check if this specific deployment is supposed to be the backend too.
  // But since the user is getting 404s, it's safer to use the dedicated backend URL.
  if (!url && typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    // If the hostname IS foodswipe-backend, then use origin
    if (window.location.hostname.includes('backend')) {
      return window.location.origin;
    }
    // Otherwise, try the known backend on Vercel
    url = 'https://foodswipe-backend.vercel.app';
  }
  
  // Priority 4: Production fallback (Hardcoded Render URL)
  if (!url && process.env.NODE_ENV === 'production') {
    url = 'https://foodswipe-6178.onrender.com';
  }

  // Priority 4: Localhost fallback
  if (!url) {
    url = 'http://localhost:8080';
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
  
  // Override if pointing to old Vercel backend
  if (url && url.includes('vercel.app')) {
    url = 'https://foodswipe-6178.onrender.com';
  }
  
  // Priority 2: Production fallback (Hardcoded Render URL)
  if (!url && process.env.NODE_ENV === 'production') {
    url = 'https://foodswipe-6178.onrender.com';
  }

  // Priority 3: Localhost fallback
  if (!url) {
    url = 'http://localhost:8080';
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
