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
import CODSettlementView from './admin/CODSettlementView';

import axios from 'axios';
import { initSocket, getSocket, disconnectSocket } from '../utils/socket';
import { API_BASE_URL } from '../utils/config';
import { FaClock } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

import ModernLoader from './ModernLoader';

interface Stats {
    totalUsers: number;
    totalRestaurants: number;
    pendingRestaurants: number;
    totalOrders: number;
    todayOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    totalCommission: number;
    netPlatformProfit?: number;
    totalDeliveryFees?: number;
    totalRiderEarnings?: number;
    totalRestaurantEarnings?: number;
    totalPendingPayouts: number;
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
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // Initial stats fetch and real-time setup
    useEffect(() => {
        console.log('AdminDashboard: Initializing...');
        setMounted(true);
        const savedTab = localStorage.getItem('adminActiveTab');
        if (savedTab) setActiveTab(savedTab);

        // Verify admin role on mount
        const userInfo = localStorage.getItem('userInfo');
        let user: any = null;
        if (userInfo) {
            try {
                user = JSON.parse(userInfo);
                const isAdminRole = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'].includes(user.role);
                
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
        const socket = initSocket(user?._id, user?.role || 'admin');

        if (socket) {
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
            socket.on('user_logged_in', updateStats);
            socket.on('admin-channel', (data: any) => {
                console.log('Admin channel event:', data);
                updateStats();
            });

            socket.on('notification', (data) => {
                if (data.type === 'success') toast.success(data.message);
                else if (data.type === 'error') toast.error(data.message);
                else toast(data.message);
            });
        }

        return () => {
            disconnectSocket();
        };
    }, []);

    const fetchStats = async () => {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const token = localStorage.getItem('token');
            
            if (!userInfoStr && !token) {
                console.error('No auth info found');
                handleLogout();
                return;
            }

            const userInfo = JSON.parse(userInfoStr || '{}');
            const authToken = token || userInfo.token;

            if (!authToken) {
                console.error('No token found');
                handleLogout();
                return;
            }

            const config = {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            };

            console.log('Fetching stats from:', `${API_BASE_URL}/api/admin/stats`);
            const res = await axios.get(`${API_BASE_URL}/api/admin/stats`, config);
            console.log('Stats received:', res.data);
            setStats(res.data);
        } catch (error: any) {
            console.error('Error fetching admin stats:', error);
            if (!error.response) {
                // Network error - silence after first toast to avoid spam
                if (loading) {
                    toast.error('Cannot connect to backend server. Is it running?', { id: 'backend-conn-error' });
                }
            } else if (error.response.status === 401) {
                toast.error('Session expired. Please login again.');
                handleLogout();
            } else {
                toast.error(`Failed to fetch dashboard data: ${error.response?.data?.message || error.message}`);
            }
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
            case 'cod-settlement':
                return <CODSettlementView />;
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

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center overflow-y-auto">
                <ModernLoader size="lg" text="Initializing Admin Panel..." />
            </div>
        );
    }

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        localStorage.setItem('adminActiveTab', tab);
    };

    return (
        <div className="h-screen bg-[#F8FAFC] flex overflow-hidden relative">
            <Toaster />
            
            {/* Background Decorative Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-orange-500/10 to-pink-500/20 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-gradient-to-tr from-orange-500/10 to-pink-500/10 blur-[80px] rounded-full"></div>
                <div className="absolute top-[20%] left-[-5%] w-[25%] h-[25%] bg-gradient-to-br from-orange-500/5 to-pink-500/5 blur-[60px] rounded-full"></div>
            </div>

            <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} onLogout={handleLogout} />
            
            <div className="flex-1 w-full md:ml-64 pt-16 md:pt-0 h-screen overflow-y-auto relative z-10 custom-scrollbar">
                {renderView()}
            </div>
        </div>
    );
}
