'use client';

import React, { useState, useEffect } from 'react';
import { FaShoppingBag, FaUtensils, FaStore, FaChartLine, FaWallet, FaStar, FaBullhorn, FaHeadset, FaConciergeBell, FaBell, FaClock, FaBox, FaCheck, FaPaperPlane, FaSignOutAlt, FaBars, FaTimes, FaBan, FaThLarge, FaMapMarkerAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import CreateRestaurant from './CreateRestaurant';
import OrderBoard from './OrderBoard';
import DashboardMenu from './DashboardMenu';
import DashboardStore from './DashboardStore';
import DashboardReviews from './DashboardReviews';
import DashboardAnalytics from './DashboardAnalytics';
import PaymentHistory from './PaymentHistory';
import KitchenDisplay from './KitchenDisplay';
import DashboardPromotions from './DashboardPromotions';
import DashboardSettings from './DashboardSettings';
import DashboardOverview from './DashboardOverview';
import DashboardSupport from './DashboardSupport';
import { getImageUrl, getImageFallback } from '../utils/imageUtils';
import { getApiUrl } from '../utils/config';
import { initSocket, disconnectSocket } from '../utils/socket';
import { useSettings } from '../hooks/useSettings';
import ModernLoader from './ModernLoader';

export default function RestaurantDashboard() {
    const { settings } = useSettings();
    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [activePage, setActivePage] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [stats, setStats] = useState({
        pending: 0,
        preparing: 0,
        ready: 0,
        outForDelivery: 0,
        revenueToday: 0,
        ordersToday: 0,
        netEarningsToday: 0,
        commissionToday: 0,
        topItems: [],
        isOnline: false
    });

    const [socket, setSocket] = useState<any>(null);
    const [newOrderModal, setNewOrderModal] = useState<any>(null);
    const [countdown, setCountdown] = useState(60);

    useEffect(() => {
        if (newOrderModal && countdown > 0) {
            const timer = setInterval(() => setCountdown(c => c - 1), 1000);
            return () => clearInterval(timer);
        } else if (countdown === 0 && newOrderModal) {
            setNewOrderModal(null);
        }
    }, [newOrderModal, countdown]);

    const handleAcceptOrder = async (orderId: string) => {
        try {
            if (!userInfo?.token) return;
            await axios.put(
                `${getApiUrl()}/api/orders/${orderId}/status`,
                { status: 'Accepted' },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            toast.success('Order Accepted');
            setNewOrderModal(null);
            fetchDashboardData(true);
            // Switch to orders page if not already there
            setActivePage('orders');
        } catch (error) {
            console.error('Error accepting order:', error);
            toast.error('Failed to accept order');
        }
    };

    const handleRejectOrder = async (orderId: string) => {
        try {
            if (!userInfo?.token) return;
            await axios.put(
                `${getApiUrl()}/api/orders/${orderId}/status`,
                { status: 'Cancelled', cancellationReason: 'Restaurant rejected the order' },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            toast.success('Order Rejected');
            setNewOrderModal(null);
            fetchDashboardData(true);
        } catch (error) {
            console.error('Error rejecting order:', error);
            toast.error('Failed to reject order');
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('userInfo');
            if (saved) setUserInfo(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        if (!userInfo) return;
        const resId = restaurant?._id || userInfo.restaurantId;
        
        if (userInfo && userInfo._id && resId) {
            console.log("Initializing dashboard socket with resId:", resId);
            const newSocket = initSocket(userInfo._id, 'restaurant', resId);
            setSocket(newSocket);
        }
        
        return () => { 
            if (socket) disconnectSocket(); 
        };
    }, [restaurant?._id, userInfo]);

    const fetchDashboardData = async (isRefresh = false) => {
        if (!userInfo) {
            console.warn('No userInfo found in dashboard state yet');
            return;
        }

        try {
            if (!isRefresh) setLoading(true);
            
            const token = userInfo.token;
            
            if (!token) {
                console.error('No token found in dashboard');
                if (typeof window !== 'undefined') window.location.href = '/login';
                return;
            }
            
            const headers = { Authorization: `Bearer ${token}` };

            console.log("Dashboard: Fetching data in parallel...");
            
            // Fetch restaurant and stats in parallel
            const [restaurantResult, statsResult] = await Promise.allSettled([
                axios.get(`${getApiUrl()}/api/restaurants/my-restaurant`, { headers }),
                axios.get(`${getApiUrl()}/api/dashboard/stats`, { headers })
            ]);

            // Handle restaurant result
            if (restaurantResult.status === 'fulfilled') {
                const restaurantData = restaurantResult.value.data;
                if (restaurantData) {
                    console.log("Dashboard: Restaurant found:", restaurantData.name);
                    setRestaurant(restaurantData);
                    localStorage.setItem("hasRestaurant", "true");
                    
                    // Update userInfo cache if needed
                    let userInfoUpdated = false;
                    const updatedUserInfo = { ...userInfo };
                    if (updatedUserInfo.restaurantId !== restaurantData._id) { updatedUserInfo.restaurantId = restaurantData._id; userInfoUpdated = true; }
                    if (updatedUserInfo.restaurantName !== restaurantData.name) { updatedUserInfo.restaurantName = restaurantData.name; userInfoUpdated = true; }
                    if (updatedUserInfo.restaurantLogo !== restaurantData.logo) { updatedUserInfo.restaurantLogo = restaurantData.logo; userInfoUpdated = true; }
                    
                    if (userInfoUpdated) {
                        setUserInfo(updatedUserInfo);
                        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
                    }
                }
            } else {
                const err = restaurantResult.reason;
                console.error('Error fetching restaurant:', err.response?.data || err.message);
                
                if (err.response?.status === 404) {
                    setRestaurant({ _id: 'new', isNew: true });
                } else if (err.response?.status === 401) {
                    localStorage.removeItem('userInfo');
                    if (typeof window !== 'undefined') window.location.href = '/login';
                } else {
                    setRestaurant({ _id: 'error', error: true, message: err.response?.data?.message || err.message });
                }
            }

            // Handle stats result
            if (statsResult.status === 'fulfilled') {
                setStats(statsResult.value.data);
            } else {
                console.error('Error fetching stats:', statsResult.reason);
            }

        } catch (error: any) {
            console.error('Error in fetchDashboardData:', error);
            if (!error.response) {
                toast.error('Network error: Cannot reach backend server');
            } else {
                toast.error(`Failed to fetch dashboard data: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            if (!userInfo?.token) return;
            const res = await axios.get(`${getApiUrl()}/api/notifications`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            // Ensure data is an array before setting
            if (Array.isArray(res.data)) {
                setNotifications(res.data);
            } else {
                console.warn("Notifications API returned non-array:", res.data);
                setNotifications([]);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]); // Safety fallback
        }
    };

    useEffect(() => {
        if (!socket || !restaurant) return;

        const handleNewOrder = (order: any) => {
            console.log('New order received via socket:', order);
            playNotificationSound();
            const newNotification = {
                _id: `socket-${Date.now()}`,
                title: 'New Order',
                message: `Order #${order._id.slice(-6).toUpperCase()} has been placed by ${order.user?.name || 'Customer'}`,
                createdAt: new Date().toISOString(),
                read: false,
                type: 'order'
            };
            setNotifications(prev => [newNotification, ...prev]);
            setNewOrderModal(order);
            setCountdown(60);
            fetchDashboardData(true);
        };

        const handleOrderUpdate = (updatedOrder: any) => {
            console.log('Order update received via socket:', updatedOrder);
            if (updatedOrder.status === 'Picked Up' || updatedOrder.status === 'Delivered') {
                const newNotification = {
                    _id: `socket-${Date.now()}`,
                    title: `Order ${updatedOrder.status}`,
                    message: `Order #${updatedOrder._id.slice(-6).toUpperCase()} is now ${updatedOrder.status}`,
                    createdAt: new Date().toISOString(),
                    read: false,
                    type: 'status'
                };
                setNotifications(prev => [newNotification, ...prev]);
            }
            fetchDashboardData(true);
        };

        const handleGenericNotification = (notification: any) => {
            console.log('Generic notification received:', notification);
            setNotifications(prev => [notification, ...prev]);
        };

        socket.on('newOrder', handleNewOrder);
        socket.on('orderStatusUpdate', handleOrderUpdate);
        socket.on('notification', handleGenericNotification);

        return () => {
            socket.off('newOrder', handleNewOrder);
            socket.off('orderStatusUpdate', handleOrderUpdate);
            socket.off('notification', handleGenericNotification);
        };
    }, [socket, restaurant]);

    useEffect(() => {
        if (userInfo) {
            fetchDashboardData();
            fetchNotifications();
        }
    }, [userInfo]);

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const markAsRead = async (id: string) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${getApiUrl()}/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        
        const file = e.target.files[0];
        
        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const token = userInfo.token;

            if (!token) {
                alert('Session expired. Please login again.');
                return;
            }

            // 1. Upload the file
            console.log('Uploading logo file...');
            const { data } = await axios.post(`${getApiUrl()}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            const uploadedPath = data.imageUrl;
            if (!uploadedPath) {
                throw new Error('No image path returned from server');
            }

            console.log('Logo uploaded to server, path:', uploadedPath);

            // 2. Update restaurant logo in backend
            // Using store-settings endpoint
            const updateRes = await axios.put(`${getApiUrl()}/api/restaurants/store-settings`,
                { logo: uploadedPath },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('Backend updated with new logo path');

            // 3. Update local state immediately
            if (restaurant) {
                setRestaurant({ ...restaurant, logo: uploadedPath });
            }
            
            // 4. Force refresh dashboard data to be sure
            await fetchDashboardData();
            
            alert('Logo updated successfully!');
        } catch (error: any) {
            console.error('Logo upload/update failed:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to update logo';
            alert(`Error: ${errorMsg}`);
        } finally {
            setUploadingLogo(false);
            // Reset input so same file can be uploaded again if needed
            if (e.target) e.target.value = '';
        }
    };

    // If it's the "new" placeholder, show CreateRestaurant
    if (restaurant?.isNew) {
        return <CreateRestaurant onRestaurantCreated={fetchDashboardData} />;
    }

    // Force verified status to avoid blocking banners if data is still loading
    const displayRestaurant = (() => {
        const info = userInfo || {};
        
        // If we have a real restaurant object, use it but merge with userInfo fallbacks
        if (restaurant && restaurant._id !== 'loading' && restaurant._id !== 'error') {
            return {
                ...restaurant,
                name: restaurant.name || info.restaurantName || info.name || 'New Restaurant',
                logo: restaurant.logo || info.restaurantLogo || '',
                isVerified: restaurant.verificationStatus === 'verified' || restaurant.isVerified || true
            };
        }

        // If it's an error or loading state, use fallbacks
        return {
            _id: restaurant?._id || 'loading',
            name: info.restaurantName || info.name || (restaurant?._id === 'error' ? 'Error Loading' : 'Loading...'),
            logo: info.restaurantLogo || '',
            verificationStatus: 'verified',
            isVerified: true,
            owner: { name: info.name || 'Owner', status: 'active' },
            ...(restaurant || {})
        };
    })();

    const isPending = displayRestaurant.verificationStatus === 'pending' || displayRestaurant.verificationStatus === 'not_started';

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: FaThLarge },
        { id: 'orders', label: 'Orders Board', icon: FaShoppingBag },
        { id: 'menu', label: 'Menu Items', icon: FaUtensils },
        { id: 'store', label: 'Store Profile', icon: FaStore },
        { id: 'analytics', label: 'Performance', icon: FaChartLine },
        { id: 'payments', label: 'Earnings', icon: FaWallet },
        { id: 'reviews', label: 'Customer Reviews', icon: FaStar },
        { id: 'promotions', label: 'Marketing Hub', icon: FaBullhorn },
        { id: 'support', label: 'Help Center', icon: FaHeadset },
        { id: 'settings', label: 'Account Settings', icon: FaClock },
    ];

    const renderContent = () => {
        // No more blocking screens, just show content or a small loader in-place
        if (!restaurant && loading) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        switch (activePage) {
            case 'overview': return <DashboardOverview stats={stats} restaurant={displayRestaurant} />;
            case 'orders': return <OrderBoard restaurant={displayRestaurant} onUpdate={fetchDashboardData} />;
            case 'menu': return <DashboardMenu restaurant={displayRestaurant} />;
            case 'store': return <DashboardStore restaurant={displayRestaurant} onUpdate={fetchDashboardData} />;
            case 'analytics': return <DashboardAnalytics restaurantId={displayRestaurant._id} />;
            case 'payments': return <PaymentHistory restaurant={displayRestaurant} onSwitchTab={setActivePage} />;
            case 'reviews': return <DashboardReviews restaurant={displayRestaurant} />;
            case 'promotions': return <DashboardPromotions restaurant={displayRestaurant} />;
            case 'support': return <DashboardSupport />;
            case 'settings': return <DashboardSettings restaurant={displayRestaurant} onUpdate={fetchDashboardData} />;
            default: return <OrderBoard restaurant={displayRestaurant} onUpdate={fetchDashboardData} />;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-inter text-[13px] overflow-x-hidden">
            {/* Account Status Banner */}
            {restaurant?.owner?.status === 'suspended' && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-center text-xs font-bold z-[9999] shadow-lg flex items-center justify-center gap-2">
                    <FaBan />
                    <span>YOUR ACCOUNT HAS BEEN SUSPENDED. Please contact support at {settings?.supportEmail || 'app.foodswipehelp@gmail.com'}</span>
                </div>
            )}

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl h-screen overflow-hidden
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                <div className="h-full flex flex-col no-scrollbar">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-800/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative group">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-800 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20">
                                    <img
                                        src={getImageUrl(displayRestaurant.logo)}
                                        alt="Logo"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = getImageFallback('logo');
                                        }}
                                    />
                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                                        {uploadingLogo ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <FaPaperPlane className="text-white text-[10px]" />
                                        )}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </label>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-[15px] font-bold truncate leading-tight font-plus-jakarta tracking-tight">{displayRestaurant.name}</h2>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate flex items-center gap-1.5 mt-1 font-bold uppercase tracking-widest">
                                    <span className={`w-1.5 h-1.5 rounded-full ${displayRestaurant.isVerified ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`}></span>
                                    {displayRestaurant.isVerified ? 'Partner' : 'Pending Verification'}
                                </p>
                            </div>
                        </div>

                        {/* Status Stats */}
                        {!isPending && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-800/40 rounded-xl p-2.5 text-center border border-gray-700/30 hover:bg-gray-800/60 transition-colors">
                                    <p className="text-[9px] text-gray-500 mb-1 font-medium uppercase tracking-widest">Earnings</p>
                                    <p className="font-semibold text-green-400 text-[12px] font-plus-jakarta">Rs. {stats?.netEarningsToday?.toLocaleString() || 0}</p>
                                </div>
                                <div className="bg-gray-800/40 rounded-xl p-2.5 text-center border border-gray-700/30 hover:bg-gray-800/60 transition-colors">
                                    <p className="text-[9px] text-gray-500 mb-1 font-medium uppercase tracking-widest">Today</p>
                                    <p className="font-semibold text-orange-400 text-[12px] font-plus-jakarta">{stats?.ordersToday || 0} Orders</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2 no-scrollbar">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                disabled={item.disabled}
                                onClick={() => {
                                    setActivePage(item.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative
                                ${
                                    activePage === item.id
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/40 scale-[1.02]'
                                        : item.disabled
                                            ? 'text-gray-600 opacity-40 cursor-not-allowed'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <item.icon className={`text-lg ${activePage === item.id ? 'text-white' : 'text-gray-500 group-hover:text-orange-400'} transition-colors duration-300`} />
                                <span className="text-[14px] font-medium tracking-wide">{item.label}</span>
                                
                                {item.id === 'orders' && stats?.pending > 0 && (
                                    <span className={`ml-auto w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold
                                        ${activePage === 'orders' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white animate-pulse'}`}>
                                        {stats.pending}
                                    </span>
                                )}

                                {item.disabled && (
                                    <div className="ml-auto">
                                        <FaTimes className="text-[10px]" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-800 space-y-3">
                        <button
                            onClick={() => {
                                localStorage.removeItem('userInfo');
                                window.location.reload();
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-colors text-[12px] font-medium tracking-wide"
                        >
                            <FaSignOutAlt /> Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 flex flex-col min-h-screen lg:ml-64">
                {/* Desktop Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 hidden lg:flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2 font-plus-jakarta">
                                {menuItems.find((i) => i.id === activePage)?.label}
                                {activePage === 'overview' && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Live</span>}
                            </h1>
                            <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">
                                Merchant Portal <span className="mx-1 text-gray-200">•</span> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Search or Quick Stats could go here */}
                        <div className="hidden xl:flex items-center gap-4 pr-6 border-r border-gray-100">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Store Status</span>
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-500 font-plus-jakarta">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                    Online & Accepting
                                </span>
                            </div>
                        </div>
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`p-2.5 rounded-2xl transition-all duration-300 relative group
                                ${showNotifications 
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' 
                                    : 'bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-500'}`}
                            >
                                <FaBell className={showNotifications ? 'animate-none' : 'group-hover:animate-bounce'} size={18} />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                        {notifications.filter(n => !n.read).length}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setShowNotifications(false)}
                                            className="fixed inset-0 z-40"
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-3 w-80 bg-white rounded-[32px] shadow-2xl border border-gray-100 z-50 overflow-hidden"
                                        >
                                            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                                <h3 className="font-bold text-gray-900">Notifications</h3>
                                                {notifications.filter(n => !n.read).length > 0 && (
                                                    <button 
                                                        onClick={() => {
                                                            notifications.forEach(n => !n.read && markAsRead(n._id));
                                                        }}
                                                        className="text-[10px] font-bold text-orange-600 uppercase tracking-wider hover:text-orange-700 transition-colors"
                                                    >
                                                        Mark all as read
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                                {notifications.length > 0 ? (
                                                    <div className="divide-y divide-gray-50">
                                                        {notifications.map((notification) => (
                                                            <div 
                                                                key={notification._id}
                                                                onClick={() => !notification.read && markAsRead(notification._id)}
                                                                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group ${!notification.read ? 'bg-orange-50/30' : ''}`}
                                                            >
                                                                {!notification.read && (
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                                                                )}
                                                                <div className="flex gap-3">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                                                                        ${notification.title.includes('Order') ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                        {notification.title.includes('Order') ? <FaShoppingBag size={16} /> : <FaBell size={16} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`text-sm leading-tight mb-1 ${!notification.read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                                                            {notification.title}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{notification.message}</p>
                                                                        <p className="text-[10px] font-medium text-gray-400">
                                                                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-10 text-center">
                                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                                                            <FaBell size={24} />
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-400">No notifications yet</p>
                                                    </div>
                                                )}
                                            </div>
                                            <button className="w-full p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 hover:bg-gray-100 transition-colors">
                                                View All Notifications
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-100 group cursor-pointer">
                            <div className="text-right hidden sm:block transition-transform group-hover:-translate-x-1 duration-300">
                                <p className="text-[14px] font-bold text-gray-900 leading-none mb-1 font-plus-jakarta tracking-tight">{displayRestaurant?.owner?.name}</p>
                                <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Restaurant Owner</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-500 p-[2px] shadow-lg shadow-orange-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center text-orange-600 font-bold text-base uppercase font-plus-jakarta">
                                        {displayRestaurant?.name?.charAt(0)}
                                    </div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-100 p-4 lg:hidden flex items-center justify-between shadow-sm sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2.5 bg-gray-100 rounded-lg text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition"
                        >
                            <FaBars />
                        </button>
                        <h1 className="font-bold text-gray-800 text-lg">
                            {menuItems.find((i) => i.id === activePage)?.label}
                        </h1>
                    </div>
                </header>

                {/* Banner for Pending Status */}
                {isPending && (
                    <div className="bg-gradient-orange-red text-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between z-20 shadow-md sticky top-16 md:top-20">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1 rounded-full animate-pulse">
                                <FaClock size={12} />
                            </div>
                            <span>
                                Your restaurant is currently in <strong>Verification Mode</strong>. Some features are restricted until approval.
                            </span>
                        </div>
                        <button
                            onClick={() => setActivePage('support')}
                            className="bg-white text-orange-600 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-gray-50 transition uppercase tracking-wider"
                        >
                            Contact Support
                        </button>
                    </div>
                )}

                <div className="flex-1 bg-gray-50/50 flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 max-w-7xl mx-auto w-full text-[13px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePage}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="min-h-full"
                            >
                                {renderContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>
{/* New Order Modal Popup */}
                <AnimatePresence>
                    {newOrderModal && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setNewOrderModal(null)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
                            >
                                {/* Modal Header */}
                                <div className="p-8 pb-4 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                                            <FaClock className="text-2xl animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 leading-tight">New Order Arrived!</h3>
                                            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Order #{newOrderModal._id.slice(-6).toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="32"
                                                cy="32"
                                                r="28"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                fill="transparent"
                                                className="text-gray-100"
                                            />
                                            <circle
                                                cx="32"
                                                cy="32"
                                                r="28"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                fill="transparent"
                                                strokeDasharray={175.9}
                                                strokeDashoffset={175.9 - (175.9 * countdown) / 60}
                                                className="text-orange-500 transition-all duration-1000"
                                            />
                                        </svg>
                                        <span className="absolute text-sm font-black text-gray-900">{countdown}s</span>
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="px-8 mb-6">
                                    <div className="bg-gray-50/80 rounded-3xl p-5 flex items-center gap-4 border border-gray-100">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                            {newOrderModal.user?.name?.[0].toUpperCase() || 'C'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 truncate">{newOrderModal.user?.name || 'Customer'}</h4>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Regular Customer</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 mt-4 px-1">
                                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mt-0.5">
                                            <FaMapMarkerAlt size={10} />
                                        </div>
                                        <p className="text-gray-500 text-xs leading-relaxed font-medium">
                                            {newOrderModal.shippingAddress?.address || 'Address not available'}
                                        </p>
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="px-8 mb-8">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Order Items</p>
                                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {newOrderModal.orderItems?.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-gray-200 group-hover:bg-orange-400 transition-colors" />
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{item.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">Qty: {item.qty}</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900">Rs. {item.price * item.qty}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-dashed border-gray-200 flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-900">Total</span>
                                        <span className="text-2xl font-black text-orange-600">Rs. {newOrderModal.totalPrice}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-8 pt-0 flex gap-4">
                                    <button
                                        onClick={() => handleRejectOrder(newOrderModal._id)}
                                        className="flex-1 py-4 rounded-2xl font-bold text-xs text-red-500 bg-red-50 hover:bg-red-100 transition-colors uppercase tracking-widest"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAcceptOrder(newOrderModal._id)}
                                        className="flex-[2] py-4 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all active:scale-95 uppercase tracking-widest"
                                    >
                                        Accept Order
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
    );
}
