'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RiderRegistration from '@/components/RiderRegistration';

export default function RiderRegisterPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            router.push('/login?redirect=/rider/register');
            return;
        }

        try {
            const userInfo = JSON.parse(userInfoStr);
            if (!userInfo || !userInfo.token) {
                console.log('Invalid session, redirecting to login');
                router.push('/login?redirect=/rider/register');
                return;
            }
            setIsAuthenticated(true);
        } catch (e) {
            console.error('Session parse error', e);
            router.push('/login?redirect=/rider/register');
        }
        setLoading(false);
    }, [router]);

    const handleRiderCreated = () => {
        // Redirect to Rider Dashboard upon success
        router.push('/rider');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 overflow-y-auto">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect
    }

    return (
        <RiderRegistration onComplete={handleRiderCreated} />
    );
}
