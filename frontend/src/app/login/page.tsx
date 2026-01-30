'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects to the main page which handles login via the LoginScreen component.
 * This separate login page is being deprecated in favor of the unified root login experience.
 */
export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        // Use replace to prevent back button from coming back here
        router.replace('/');
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-orange-red flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
    );
}


