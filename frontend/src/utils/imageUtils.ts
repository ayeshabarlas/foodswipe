import { getApiUrl } from './config';

/**
 * Normalizes image paths and returns a full URL.
 * Handles both local development and production (Koyeb/Vercel).
 */
export const getImageUrl = (path: string | undefined | null) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return '';
    
    // Normalize slashes
    let cleanPath = path.replace(/\\/g, '/');
    
    // If it's already a full URL or base64, return it
    if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) {
        return cleanPath;
    }
    
    // Remove leading ./ ../ / 
    let oldPath;
    do {
        oldPath = cleanPath;
        // Specifically avoid removing 'uploads/' if it's already at the start
        if (cleanPath.startsWith('uploads/')) break;
        cleanPath = cleanPath.replace(/^(\.\/|\.\.\/|\/)+/, '');
    } while (cleanPath !== oldPath);
    
    // If it starts with 'uploads/', don't remove it, just ensure we don't double it later
    const hasUploads = cleanPath.startsWith('uploads/');
    const pathWithoutUploads = hasUploads ? cleanPath.replace(/^uploads\//, '') : cleanPath;

    const API_URL = getApiUrl();
    // Remove /api from the end if it exists, as static files are served from root
    let baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4);
    }
    
    // Ensure we always return a valid URL starting with /uploads/
    // If the path already includes 'uploads', we use the path without double 'uploads'
    return `${baseUrl}/uploads/${pathWithoutUploads}`;
};

/**
 * Returns a fallback image if the primary one fails
 */
export const getImageFallback = (type: 'logo' | 'dish' | 'document' | 'user' = 'logo') => {
    const fallbacks = {
        logo: 'https://via.placeholder.com/150?text=FoodSwipe',
        dish: 'https://via.placeholder.com/400?text=Delicious+Food',
        document: 'https://via.placeholder.com/600x400?text=Document+Not+Found',
        user: 'https://via.placeholder.com/150?text=User'
    };
    return fallbacks[type];
};
