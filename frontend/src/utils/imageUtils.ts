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
    let cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
    
    // 3. Extract just the filename if it includes 'uploads/'
    if (cleanPath.includes('uploads/')) {
        cleanPath = cleanPath.split('uploads/').pop() || cleanPath;
    }
    
    // 4. Clean up any remaining directory structures to get just the filename
    const fileName = cleanPath.split('/').pop() || cleanPath;

    // 5. Prepare Base URL (ensure no trailing slash)
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    // 6. Return the standard uploads URL
    return `${baseUrl}/api/uploads/${fileName}`;
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
