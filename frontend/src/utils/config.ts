const getApiUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL;
  
  // If no env var, try to determine based on environment
  if (!url) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:5000'; // Match backend port 5000
      }
      // If on Vercel but no API URL set, try the railway production URL
      if (host.includes('vercel.app')) {
        return 'https://foodswipe-production-46d6.up.railway.app';
      }
    }
    return 'http://localhost:5000';
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
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:5000';
      }
      if (host.includes('vercel.app')) {
        return 'https://foodswipe-production-46d6.up.railway.app';
      }
    }
    return 'http://localhost:5000';
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
