import { API_BASE_URL } from './config';

export const getImageUrl = (path: string | undefined | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    // Normalize slashes
    let cleanPath = path.replace(/\\/g, '/');
    
    // Remove leading slash if present
    if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
    }
    
    // Ensure it has uploads/ prefix if it's a relative path to our backend
    if (!cleanPath.startsWith('uploads/')) {
        cleanPath = `uploads/${cleanPath}`;
    }
    
    return `${API_BASE_URL}/${cleanPath}`;
};
