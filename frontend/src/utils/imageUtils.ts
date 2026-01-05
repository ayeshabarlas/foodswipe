import { API_BASE_URL } from './config';

export const getImageUrl = (path: string | undefined | null) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return '';
    
    // Ensure API_BASE_URL doesn't end with slash
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    // Handle full URLs
    if (path.startsWith('http')) {
        // If it's a Railway URL but we are on Koyeb, swap the domain
        if (path.includes('railway.app') && baseUrl.includes('koyeb.app')) {
            const pathParts = path.split('/uploads/');
            if (pathParts.length > 1) {
                return `${baseUrl}/uploads/${pathParts[1]}`;
            }
        }
        return path;
    }
    
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
    
    // FORCE FULL URL FOR KOYEB IMAGES
    if (baseUrl.includes('koyeb.app') && !cleanPath.startsWith('http')) {
        const fullUrl = `${baseUrl}/${cleanPath}`;
        return fullUrl;
    }
    
    const finalUrl = `${baseUrl}/${cleanPath}`;
    
    // Debug for production
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        console.log('🖼️ Image URL:', { original: path, final: finalUrl });
    }
    
    return finalUrl;
};
