import { API_BASE_URL } from './config';

/**
 * Normalizes image paths and returns a full URL.
 * Handles both local development and production (Koyeb/Vercel).
 */
export const getImageUrl = (path: string | undefined | null) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return '';
    
    // 1. If it's already a full URL, return it (but handle potential backslashes)
    if (path.startsWith('http')) {
        return path.replace(/\\/g, '/');
    }
    
    // 2. Normalize path (remove leading slashes, handle backslashes)
    let cleanPath = path.replace(/\\/g, '/');
    
    // If it contains "uploads/", extract everything from "uploads/" onwards
    const uploadsIndex = cleanPath.indexOf('uploads/');
    if (uploadsIndex !== -1) {
        cleanPath = cleanPath.substring(uploadsIndex);
    } else {
        cleanPath = cleanPath.replace(/^\/+/, '');
    }
    
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    // 3. If it's a relative path starting with uploads/, just prepend base URL
    if (cleanPath.startsWith('uploads/')) {
        return `${baseUrl}/${cleanPath}`;
    }
    
    // 4. Otherwise, assume it's relative to uploads/
    return `${baseUrl}/uploads/${cleanPath}`;
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
