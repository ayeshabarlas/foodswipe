import { API_BASE_URL } from './config';

/**
 * Normalizes image paths and returns a full URL.
 * Handles both local development and production (Koyeb/Vercel).
 */
export const getImageUrl = (path: string | undefined | null) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return '';
    
    // 1. Normalize slashes to forward slashes
    let cleanPath = path.replace(/\\/g, '/');
    
    // 2. Prepare Base URL (ensure no trailing slash)
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    // 3. Handle Full URLs (http/https)
    if (cleanPath.startsWith('http')) {
        // If it's a legacy Railway URL but we're on Koyeb, or it's a Koyeb URL without /api/
        // We want to force it through our /api/uploads proxy/route for consistency
        if (cleanPath.includes('/uploads/')) {
            const fileName = cleanPath.split('/uploads/').pop();
            if (fileName) {
                return `${baseUrl}/api/uploads/${fileName}`;
            }
        }
        return cleanPath;
    }

    // 4. Handle Relative Paths
    // Extract filename if it contains 'uploads/'
    let fileName = cleanPath;
    if (cleanPath.includes('uploads/')) {
        const parts = cleanPath.split('uploads/');
        fileName = parts[parts.length - 1];
    }

    // Remove any leading slashes or extra path components from filename
    // We only want the final filename
    if (fileName.includes('/')) {
        fileName = fileName.split('/').pop() || fileName;
    }
    
    fileName = fileName.replace(/^\/+/, '');

    // 5. Construct Final URL
    // Ensure we don't have double slashes except for protocol
    const finalUrl = `${baseUrl}/api/uploads/${fileName}`.replace(/([^:]\/)\/+/g, "$1");

    // Debugging for non-localhost environments
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        // console.log('🖼️ Image URL Debug:', { original: path, final: finalUrl });
    }

    return finalUrl;
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
