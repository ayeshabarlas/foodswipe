const getApiUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL;
  
  // If no env var, try to determine based on environment
  if (!url) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      // Force Koyeb URL as primary production API
      if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.')) {
        return 'https://colossal-anya-foodswipe-a3e25304.koyeb.app';
      }
    }
    // Default fallback
    return process.env.NODE_ENV === 'production' 
      ? 'https://colossal-anya-foodswipe-a3e25304.koyeb.app' 
      : 'http://localhost:5000';
  }
  
  // Ensure protocol
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const getSocketUrl = () => {
  let url = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!url) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.')) {
        return 'https://colossal-anya-foodswipe-a3e25304.koyeb.app';
      }
    }
    return process.env.NODE_ENV === 'production' 
      ? 'https://colossal-anya-foodswipe-a3e25304.koyeb.app' 
      : 'http://localhost:5000';
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
