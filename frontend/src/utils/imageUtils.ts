import { API_BASE_URL } from './config';

/**
 * Normalizes image paths and returns a full URL.
 * Handles both local development and production (Koyeb/Vercel).
 */
export const getImageUrl = (path: string | undefined | null) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return '';
    
    // Normalize slashes
    let cleanPath = path.replace(/\\/g, '/');
    
    // If it's already a full URL, return it
    if (cleanPath.startsWith('http')) {
        return cleanPath;
    }
    
    // Remove any leading slashes or 'uploads/' prefix
    // We do this repeatedly to handle cases like '/uploads/uploads/file.jpg'
    let oldPath;
    do {
        oldPath = cleanPath;
        cleanPath = cleanPath.replace(/^(\.\/|\.\.\/|\/|uploads\/)+/, '');
    } while (cleanPath !== oldPath);
    
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    
    // Always return with /uploads/ prefix
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
