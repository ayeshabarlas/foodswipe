// Admin Page - Force Build v2.2.17 - 2026-01-30 05:55
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), { 
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
});

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated and has admin role
        const userInfo = localStorage.getItem('userInfo');

        console.log('Admin Page - Checking authentication...');
        console.log('UserInfo from localStorage:', userInfo);

        if (!userInfo) {
            console.log('No userInfo found, redirecting to login');
            router.push('/admin/login');
            return;
        }

        try {
            const user = JSON.parse(userInfo);
            console.log('Parsed user:', user);
            console.log('User role:', user.role);

            // Verify admin role (allow any admin-related role)
            const isAdminRole = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'].includes(user.role);
            
            if (!isAdminRole) {
                console.error('Unauthorized: User role is', user.role, 'but expected an admin role');
                // Clear stale non-admin session if we're in the admin area
                localStorage.removeItem('userInfo');
                localStorage.removeItem('token');
                router.push('/admin/login');
                return;
            }

            console.log('✅ Admin access granted');
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Error parsing user info:', error);
            setError('Error loading user data. Please login again.');
            setIsLoading(false);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/admin/login')}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition"
                        >
                            Go to Admin Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect
    }

    return <AdminDashboard />;
}
