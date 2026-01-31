'use client';

// Force Redeploy: 2026-01-24 16:45
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import views to solve TDZ errors and improve performance
const Sidebar = dynamic(() => import('./admin/Sidebar'), { ssr: false });
const DashboardHome = dynamic(() => import('./admin/DashboardHome'), { ssr: false });
const FinanceView = dynamic(() => import('./admin/FinanceView'), { ssr: false });
const RestaurantWalletsView = dynamic(() => import('./admin/RestaurantWalletsView'), { ssr: false });
const RiderWalletsView = dynamic(() => import('./admin/RiderWalletsView'), { ssr: false });
const RestaurantsView = dynamic(() => import('./admin/RestaurantsView'), { ssr: false });
const OrdersView = dynamic(() => import('./admin/OrdersView'), { ssr: false });
const EnhancedOrdersView = dynamic(() => import('./admin/EnhancedOrdersView'), { ssr: false });
const RidersView = dynamic(() => import('./admin/RidersView'), { ssr: false });
const RiderLiveMap = dynamic(() => import('./admin/RiderLiveMap'), { ssr: false });
const PaymentsView = dynamic(() => import('./admin/PaymentsView'), { ssr: false });
const VouchersView = dynamic(() => import('./admin/VouchersView'), { ssr: false });
const ReportsView = dynamic(() => import('./admin/ReportsView'), { ssr: false });
const SettingsView = dynamic(() => import('./admin/SettingsView'), { ssr: false });
const VerificationsView = dynamic(() => import('./admin/VerificationsView'), { ssr: false });
const CustomersView = dynamic(() => import('./admin/CustomersView'), { ssr: false });
const BonusManagementView = dynamic(() => import('./admin/BonusManagementView'), { ssr: false });
const AdminManagementView = dynamic(() => import('./admin/AdminManagementView'), { ssr: false });
const SupportView = dynamic(() => import('./admin/SupportView'), { ssr: false });
const CODSettlementView = dynamic(() => import('./admin/CODSettlementView'), { ssr: false });
const NotificationList = dynamic(() => import('./admin/NotificationList'), { ssr: false });
const HistoryView = dynamic(() => import('./admin/HistoryView'), { ssr: false });

import axios from 'axios';
import { initSocket, getSocket, disconnectSocket } from '../utils/socket';
import { getApiUrl } from '../utils/config';
import { FaClock, FaBell, FaExclamationTriangle } from 'react-icons/fa';
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
    const [statsError, setStatsError] = useState<string | null>(null);
    const [notificationCounts, setNotificationCounts] = useState({
        pendingRestaurants: 0,
        pendingRiders: 0,
        newOrders: 0,
        newUsers: 0,
        totalNotifications: 0
    });
    // Local state to track "seen" counts so we can reset badges on click
    const [lastSeenCounts, setLastSeenCounts] = useState({
        pendingRestaurants: 0,
        pendingRiders: 0,
        newOrders: 0,
        newUsers: 0
    });

    // Initialize from localStorage on mount
    const [showNotifications, setShowNotifications] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('adminLastSeenCounts');
            if (saved) {
                try {
                    setLastSeenCounts(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse last seen counts', e);
                }
            }
        }
    }, []);

    // Save to localStorage whenever it changes


    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        localStorage.setItem('adminActiveTab', tab);

        // Reset counts logic
        setLastSeenCounts(prev => {
            const next = { ...prev };
            let changed = false;

            if (tab === 'restaurants' || tab === 'restaurants-pending') {
                if (next.pendingRestaurants !== notificationCounts.pendingRestaurants) {
                    next.pendingRestaurants = notificationCounts.pendingRestaurants;
                    changed = true;
                }
            }
            if (tab === 'riders' || tab === 'riders-pending') {
                if (next.pendingRiders !== notificationCounts.pendingRiders) {
                    next.pendingRiders = notificationCounts.pendingRiders;
                    changed = true;
                }
            }
            if (tab === 'orders' || tab === 'orders-live') {
                if (next.newOrders !== notificationCounts.newOrders) {
                    next.newOrders = notificationCounts.newOrders;
                    changed = true;
                }
            }
            if (tab === 'customers') {
                if (next.newUsers !== notificationCounts.newUsers) {
                    next.newUsers = notificationCounts.newUsers;
                    changed = true;
                }
            }

            if (changed) {
                localStorage.setItem('adminLastSeenCounts', JSON.stringify(next));
            }
            return next;
        });
    };

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
                toast.success(`New Restaurant: ${restaurant?.name || 'Partner'} registered!`, {
                    duration: 6000,
                    position: 'top-right',
                    icon: '🏪',
                });
                updateStats();
            });

            socket.on('rider_registered', (rider) => {
                console.log('New rider registered!', rider);
                toast.success(`New Rider: ${rider?.fullName || rider?.name || 'Delivery Partner'} registered!`, {
                    duration: 6000,
                    position: 'top-right',
                    icon: '🏍️',
                });
                updateStats();
            });

            socket.on('user_registered', (user) => {
                console.log('New user registered!', user);
                toast.success(`New Customer: ${user?.name || 'User'} registered!`, {
                    duration: 5000,
                    position: 'top-right',
                    icon: '👤',
                });
                updateStats();
            });

            socket.on('rider_status_updated', updateStats);
            socket.on('rider_updated', updateStats);
            socket.on('restaurant_updated', updateStats);
            socket.on('user_logged_in', updateStats);
            socket.on('admin-channel', (data: any) => {
                console.log('Admin channel event:', data);
                updateStats();
            });

            socket.on('notification_received', (data) => {
                console.log('Admin notification received:', data);
                playNotificationSound();
                toast(data.message, {
                    icon: data.type === 'new_order' ? '🛒' : data.type === 'new_restaurant' ? '🏪' : '👤',
                    duration: 5000,
                });
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

            // Increase timeout to 30s and handle requests individually to be more resilient
            const axiosConfig = { ...config, timeout: 30000 };

            console.log('Fetching stats from:', `${getApiUrl()}/api/admin/stats`);
            
            // Fetch stats and counts separately so one failing doesn't kill the other
            const fetchStatsPromise = axios.get(`${getApiUrl()}/api/admin/stats`, axiosConfig)
                .then(res => {
                    console.log('Stats received:', res.data);
                    setStats(res.data);
                    setStatsError(null);
                })
                .catch(err => {
                    console.error('Error fetching stats:', err);
                    setStatsError(err.response?.data?.message || err.message || 'Failed to fetch dashboard stats');
                    // Fallback stats if first load fails
                    if (!stats) {
                        setStats({
                            totalUsers: 0, totalRestaurants: 0, pendingRestaurants: 0, totalOrders: 0,
                            todayOrders: 0, totalRevenue: 0, todayRevenue: 0, totalCommission: 0,
                            totalPendingPayouts: 0, revenueStats: [], orderStatusDist: { delivered: 0, cancelled: 0, inProgress: 0 },
                            topRestaurants: [], recentActivity: [], totalRiders: 0, pendingRiders: 0,
                            onlineRiders: 0, avgRiderRating: 0
                        });
                    }
                });

            const fetchCountsPromise = axios.get(`${getApiUrl()}/api/admin/notifications/counts`, axiosConfig)
                .then(res => {
                    console.log('Counts received:', res.data);
                    setNotificationCounts(res.data);
                })
                .catch(err => {
                    console.error('Error fetching counts:', err);
                });

            // Start fetching but don't block the whole UI if it's slow
            Promise.allSettled([fetchStatsPromise, fetchCountsPromise]).finally(() => {
                setLoading(false);
            });
            
            // Set loading to false after a short delay anyway to show the shell
            // if the network is being very slow, but give it a chance to load data first
            setTimeout(() => {
                if (mounted) setLoading(false);
            }, 3000); // 3 seconds max for the initial blank screen

        } catch (error: any) {
            console.error('Error in fetchStats wrapper:', error);
            toast.error('Connection issue. Please check if backend is online.');
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
                return <DashboardHome stats={stats} statsError={statsError} refreshStats={fetchStats} />;

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
            case 'bonus-management':
                return <BonusManagementView />;

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
            case 'history':
                return <HistoryView />;
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

    // Display counts calculation moved to top scope if needed, or just function here
    const getDisplayCounts = () => {
        return {
            pendingRestaurants: Math.max(0, notificationCounts.pendingRestaurants - lastSeenCounts.pendingRestaurants),
            pendingRiders: Math.max(0, notificationCounts.pendingRiders - lastSeenCounts.pendingRiders),
            newOrders: Math.max(0, notificationCounts.newOrders - lastSeenCounts.newOrders),
            newUsers: Math.max(0, notificationCounts.newUsers - lastSeenCounts.newUsers),
            totalNotifications: notificationCounts.totalNotifications // Total stays real for the bell
        };
    };

    const displayCounts = getDisplayCounts();
    // Calculate total badge count based on displayed (unseen) items only for the sidebar, 
    // but usually the sidebar sub-badges are what matter. 
    // The bell icon (totalNotifications) usually stays as the "Backend Total" until "Mark All Read" is clicked or items are processed.
    // However, the user request specifically asked for "sidebar tab click resets count".



    const handleNavigateFromNotification = (tab: string) => {
        setShowNotifications(false);
        handleTabChange(tab);
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

            <Sidebar
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                onLogout={handleLogout}
                notificationCounts={displayCounts}
            />

            <div className="flex-1 w-full md:ml-64 pt-16 md:pt-0 h-screen overflow-y-auto relative z-10 custom-scrollbar">
                {/* Floating Notification Bell */}
                <div className="fixed top-4 right-4 md:top-6 md:right-8 z-[100] flex items-center gap-3">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-gray-600 hover:text-orange-500 transition-all duration-300 border border-gray-100 group relative"
                    >
                        <FaBell className={`text-xl transition-transform duration-500 ${showNotifications ? 'rotate-[20deg]' : ''}`} />
                        {(notificationCounts.totalNotifications > 0) && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-lg flex items-center justify-center border-2 border-white animate-pulse">
                                {notificationCounts.totalNotifications}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute top-14 right-0 animate-in fade-in slide-in-from-top-4 duration-300">
                            <NotificationList
                                onClose={() => setShowNotifications(false)}
                                notificationCounts={notificationCounts}
                                onNavigate={handleNavigateFromNotification}
                            />
                        </div>
                    )}
                </div>

                {renderView()}
            </div>
        </div>
    );
}
