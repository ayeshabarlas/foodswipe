'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateRestaurant from '@/components/CreateRestaurant';

export default function RestaurantRegisterPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            router.push('/login?redirect=/restaurant/register');
            return;
        }

        try {
            const userInfo = JSON.parse(userInfoStr);
            if (!userInfo || !userInfo.token) {
                console.log('Invalid session, redirecting to login');
                router.push('/login?redirect=/restaurant/register');
                return;
            }
            setIsAuthenticated(true);
        } catch (e) {
            console.error('Session parse error', e);
            router.push('/login?redirect=/restaurant/register');
        }
        setLoading(false);
    }, [router]);

    const handleRestaurantCreated = () => {
        // Force refresh to update tokens/roles if needed, or just push
        // Ideally backend updates role, we might need to refresh token? 
        // For now, simple redirect. The dashboard gracefully handles pending status.
        router.push('/restaurant');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect
    }

    return (
        <CreateRestaurant onRestaurantCreated={handleRestaurantCreated} />
    );
}
