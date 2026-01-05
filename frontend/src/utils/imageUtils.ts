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
        
        // Fix Koyeb broken documents by ensuring /api/ prefix if needed
        // Most common case is when path has /uploads/ but is missing /api/
        if (baseUrl.includes('koyeb.app') && path.includes('/uploads/') && !path.includes('/api/uploads/')) {
             const parts = path.split('/uploads/');
             return `${baseUrl}/api/uploads/${parts[1]}`;
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
    
    // Ensure it has api/uploads/ prefix if it's a relative path to our backend on Koyeb
    if (baseUrl.includes('koyeb.app')) {
        // If it already has api/uploads, just clean it
        if (cleanPath.includes('api/uploads/')) {
            const index = cleanPath.indexOf('api/uploads/');
            cleanPath = cleanPath.slice(index);
        } else if (cleanPath.includes('uploads/')) {
            // If it has uploads but not api, add api
            const index = cleanPath.indexOf('uploads/');
            cleanPath = `api/${cleanPath.slice(index)}`;
        } else {
            // Otherwise add both
            cleanPath = `api/uploads/${cleanPath}`;
        }
    } else {
        if (!cleanPath.startsWith('uploads/') && !cleanPath.includes('uploads/')) {
            cleanPath = `uploads/${cleanPath}`;
        }
    }
    
    // Final normalization: remove any leading slash from cleanPath
    cleanPath = cleanPath.replace(/^\/+/, '');
    
    const finalUrl = `${baseUrl}/${cleanPath}`;
    
    // Debug for production
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        console.log('🖼️ Image URL:', { original: path, final: finalUrl });
    }
    
    return finalUrl;
};
