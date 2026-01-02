'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './admin/Sidebar';
import DashboardHome from './admin/DashboardHome';
import FinanceView from './admin/FinanceView';
import RestaurantWalletsView from './admin/RestaurantWalletsView';
import RiderWalletsView from './admin/RiderWalletsView';
import RestaurantsView from './admin/RestaurantsView';
import OrdersView from './admin/OrdersView';
import EnhancedOrdersView from './admin/EnhancedOrdersView';
import RidersView from './admin/RidersView';
import RiderLiveMap from './admin/RiderLiveMap';
import PaymentsView from './admin/PaymentsView';
import VouchersView from './admin/VouchersView';
import ReportsView from './admin/ReportsView';
import SettingsView from './admin/SettingsView';
import VerificationsView from './admin/VerificationsView';
import CustomersView from './admin/CustomersView';
import AdminManagementView from './admin/AdminManagementView';
import SupportView from './admin/SupportView';

import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../utils/config';
import toast, { Toaster } from 'react-hot-toast';

interface Stats {
    totalUsers: number;
    totalRestaurants: number;
    pendingRestaurants: number;
    totalOrders: number;
    todayOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    revenueStats: { date: string; revenue: number }[];
    orderStatusDist: { delivered: number; cancelled: number; inProgress: number };
    topRestaurants: any[];
    recentActivity: any[];
    totalRiders: number;
    pendingRiders: number;
    onlineRiders: number;
    avgRiderRating: number;
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('adminActiveTab') || 'dashboard';
        }
        return 'dashboard';
    });
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Verify admin role on mount
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const user = JSON.parse(userInfo);
                const isAdminRole = ['admin', 'super-admin', 'finance-admin', 'support-admin'].includes(user.role);
                
                if (!isAdminRole) {
                    console.error('Unauthorized: User is not an admin. Role:', user.role);
                    handleLogout();
                    return;
                }
            } catch (error) {
                console.error('Error parsing user info:', error);
                handleLogout();
                return;
            }
        }

        fetchStats();

        // Join admin room for real-time updates
        const socket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        if (userInfo) {
            try {
                const user = JSON.parse(userInfo);
                socket.emit('join', { userId: user._id, role: 'admin' });
                console.log('Joined admin room for real-time updates');
            } catch (e) {
                console.error('Error joining admin room:', e);
            }
        }

        // Standard listeners for dashboard-wide updates
        const updateStats = () => {
            console.log('Real-time update received: fetching new stats');
            fetchStats();
        };

        // Sound notification for new orders
        const playNotificationSound = () => {
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                audio.play().catch(e => console.log('Audio play failed:', e));
            } catch (e) {
                console.error('Error playing sound:', e);
            }
        };

        socket.on('order_created', (order) => {
            if (!order) return;
            console.log('New order created!', order);
            playNotificationSound();
            const orderId = order.orderNumber || (order._id ? order._id.substring(0, 8) : 'New');
            toast.success(`New Order #${orderId} created!`, {
                duration: 5000,
                position: 'top-right',
                icon: '🛒',
            });
            updateStats();
        });

        socket.on('order_updated', (order) => {
            if (!order) return;
            const orderId = order.orderNumber || (order._id ? order._id.substring(0, 8) : 'Update');
            toast.info(`Order #${orderId} status updated to ${order.status}`, {
                position: 'top-right',
            });
            updateStats();
        });

        socket.on('restaurant_registered', (restaurant) => {
            console.log('New restaurant registered!', restaurant);
            toast.success(`New Restaurant: ${restaurant.name} registered!`, {
                duration: 6000,
                position: 'top-right',
                icon: '🏪',
            });
            updateStats();
        });
        socket.on('restaurant_updated', updateStats);
        socket.on('stats_updated', updateStats);
        socket.on('rider_updated', updateStats);
        socket.on('user_registered', updateStats);

        socket.on('notification', (data) => {
            if (data.type === 'success') toast.success(data.message);
            else if (data.type === 'error') toast.error(data.message);
            else toast(data.message);
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected');
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected, attempting to reconnect...');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchStats = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            const res = await axios.get(`${API_BASE_URL}/api/admin/stats`, config);
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        router.push('/admin/login');
    };

    const renderView = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardHome stats={stats} refreshStats={fetchStats} />;

            // Restaurant Sub-menus
            case 'restaurants': // Default fallback
            case 'restaurants-all':
                return <RestaurantsView />;
            case 'restaurants-pending':
                return <VerificationsView initialTab="restaurants" />;
            case 'riders-pending':
                return <VerificationsView initialTab="riders" />;

            // Rider Sub-menus
            case 'riders': // Default fallback
            case 'riders-all':
                return <RidersView />;
            case 'riders-map':
                return <RiderLiveMap />;

            // Order Sub-menus
            case 'orders': // Default fallback
            case 'orders-live':
                return <OrdersView />;
            case 'orders-all':
            case 'all-orders': // Legacy
                return <EnhancedOrdersView />;

            case 'customers':
                return <CustomersView />;
            case 'finance':
                return <FinanceView />;
            case 'payments':
                return <PaymentsView />;
            case 'vouchers':
                return <VouchersView />;
            case 'support':
                return <SupportView />;
            case 'admin-management':
                return <AdminManagementView />;
            case 'reports':
                return <ReportsView />;
            case 'settings':
                return <SettingsView />;
            case 'verifications': // Legacy fallback
                return <VerificationsView />;
            default:
                return <DashboardHome stats={stats} />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        localStorage.setItem('adminActiveTab', tab);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <Toaster />
            <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} onLogout={handleLogout} />
            <div className="flex-1 w-full md:ml-64 pt-16 md:pt-0">
                {renderView()}
            </div>
        </div>
    );
}
