const getApiUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) return 'http://localhost:8080';
  
  // Ensure protocol
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const getSocketUrl = () => {
  let url = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!url) return 'http://localhost:8080';

  // Ensure protocol
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

console.log('🌐 Frontend Config:', { API_BASE_URL, SOCKET_URL });
