const getApiUrl = () => {
  // Priority 1: Environment variable
  let url = process.env.NEXT_PUBLIC_API_URL;
  
  // Priority 2: Production fallback (Hardcoded Vercel URL)
  if (!url && process.env.NODE_ENV === 'production') {
    url = 'https://foodswipe-backend.vercel.app';
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

const getSocketUrl = () => {
  // Priority 1: Environment variable
  let url = process.env.NEXT_PUBLIC_SOCKET_URL;
  
  // Priority 2: Production fallback (Hardcoded Vercel URL)
  if (!url && process.env.NODE_ENV === 'production') {
    url = 'https://foodswipe-backend.vercel.app';
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
