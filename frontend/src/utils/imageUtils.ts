import { API_BASE_URL } from './config';

export const getImageUrl = (path: string | undefined | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Normalize slashes and remove leading slash if present to avoid double slashes
    const normalizedPath = path.replace(/\\/g, '/');
    const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
    return `${API_BASE_URL}/${cleanPath}`;
};
