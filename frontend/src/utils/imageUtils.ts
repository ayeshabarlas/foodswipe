import { API_BASE_URL } from './config';

export const getImageUrl = (path: string | undefined | null) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return '';
    if (path.startsWith('http')) return path;
    
    // Normalize slashes
    let cleanPath = path.replace(/\\/g, '/');
    
    // Remove leading slash if present
    while (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
    }
    
    // Remove duplicate slashes
    cleanPath = cleanPath.replace(/\/+/g, '/');
    
    // Ensure it has uploads/ prefix if it's a relative path to our backend
    if (!cleanPath.startsWith('uploads/') && !cleanPath.includes('uploads/')) {
        cleanPath = `uploads/${cleanPath}`;
    } else if (cleanPath.includes('uploads/')) {
        // If uploads/ is somewhere else, extract it
        const index = cleanPath.indexOf('uploads/');
        cleanPath = cleanPath.slice(index);
    }
    
    // Final normalization: remove any leading slash from cleanPath
    cleanPath = cleanPath.replace(/^\/+/, '');
    
    // Ensure API_BASE_URL doesn't end with slash
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    
    const finalUrl = `${baseUrl}/${cleanPath}`;
    return finalUrl;
};
