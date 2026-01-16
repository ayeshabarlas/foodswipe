'use client';

import React, { useState, useEffect } from 'react';
import { FaShoppingBag, FaUtensils, FaStore, FaChartLine, FaWallet, FaStar, FaBullhorn, FaHeadset, FaConciergeBell, FaBell, FaClock, FaBox, FaCheck, FaPaperPlane, FaSignOutAlt, FaBars, FaTimes, FaBan, FaThLarge } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
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
import { API_BASE_URL } from '../utils/config';
import { initSocket, disconnectSocket } from '../utils/socket';
import ModernLoader from './ModernLoader';

export default function RestaurantDashboard() {
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

    // Socket state
    const [socket, setSocket] = useState<any>(null);

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
                axios.get(`${API_BASE_URL}/api/restaurants/my-restaurant`, { headers }),
                axios.get(`${API_BASE_URL}/api/dashboard/stats`, { headers })
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
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            if (!userInfo?.token) return;
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
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
                _id: Date.now().toString(),
                title: 'New Order Received',
                message: `Order #${order._id.slice(-6).toUpperCase()} has been placed`,
                createdAt: new Date().toISOString(),
                read: false
            };
            setNotifications(prev => [newNotification, ...prev]);
            fetchDashboardData(true); // Silent refresh
        };

        const handleOrderUpdate = () => {
            console.log('Order update received via socket');
            fetchDashboardData(true); // Silent refresh
        };

        socket.on('newOrder', handleNewOrder);
        socket.on('orderStatusUpdate', handleOrderUpdate);

        return () => {
            socket.off('newOrder', handleNewOrder);
            socket.off('orderStatusUpdate', handleOrderUpdate);
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
            await axios.put(`${API_BASE_URL}/api/notifications/${id}/read`, {}, {
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
            const { data } = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
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
            const updateRes = await axios.put(`${API_BASE_URL}/api/restaurants/store-settings`,
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
                name: restaurant.name || info.restaurantName || info.name || 'Spice Restaurant',
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
        { id: 'promotions', label: 'Promotions', icon: FaBullhorn },
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
            case 'payments': return <PaymentHistory restaurant={displayRestaurant} />;
            case 'reviews': return <DashboardReviews restaurant={displayRestaurant} />;
            case 'promotions': return <DashboardPromotions restaurant={displayRestaurant} />;
            case 'support': return <DashboardSupport />;
            case 'settings': return <DashboardSettings restaurant={displayRestaurant} onUpdate={fetchDashboardData} />;
            default: return <OrderBoard restaurant={displayRestaurant} onUpdate={fetchDashboardData} />;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-[11px] overflow-x-hidden">
            {/* Account Status Banner */}
            {restaurant?.owner?.status === 'suspended' && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-center text-xs font-bold z-[9999] shadow-lg flex items-center justify-center gap-2">
                    <FaBan />
                    <span>YOUR ACCOUNT HAS BEEN SUSPENDED. Please contact support at app.foodswipehelp@gmail.com</span>
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
                className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl min-h-screen overflow-y-auto
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center gap-3 mb-2">
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
                                    <h2 className="text-[13px] font-bold truncate leading-tight">{displayRestaurant.name}</h2>
                                </div>
                                <p className="text-[9px] text-gray-400 truncate flex items-center gap-1.5 mt-0.5 font-bold uppercase tracking-wider">
                                    <span className={`w-1.5 h-1.5 rounded-full ${displayRestaurant.isVerified ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                                    {displayRestaurant.isVerified ? 'Partner' : 'Pending'}
                                </p>
                            </div>
                        </div>

                        {/* Status Stats */}
                        {!isPending && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/30">
                                    <p className="text-[8px] text-gray-500 mb-0.5 font-bold uppercase tracking-wider">Earnings</p>
                                    <p className="font-bold text-green-400 text-[10px]">Rs. {stats?.netEarningsToday?.toLocaleString() || 0}</p>
                                </div>
                                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/30">
                                    <p className="text-[8px] text-gray-500 mb-0.5 font-bold uppercase tracking-wider">Today</p>
                                    <p className="font-bold text-orange-400 text-[10px]">{stats?.ordersToday || 0} Orders</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-3 custom-scrollbar">
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
            <main className="flex-1 min-w-0 flex flex-col min-h-screen">
                {/* Desktop Header */}
                <header className="bg-white border-b border-gray-100 p-4 hidden lg:flex items-center justify-between shadow-sm sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                            {menuItems.find((i) => i.id === activePage)?.label}
                        </h1>
                        <div className="h-6 w-[1px] bg-gray-200" />
                        <p className="text-gray-500 text-xs">
                            Welcome back, {displayRestaurant.owner?.name?.split(' ')[0] || 'Partner'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-orange-50 hover:text-orange-500 transition relative group"
                            >
                                <FaBell className="text-sm" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                )}
                            </button>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3 pl-3 border-l border-gray-100">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-gray-900 leading-none">{displayRestaurant?.owner?.name}</p>
                                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">Restaurant Owner</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-orange-400 p-[2px] shadow-md">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-orange-500 font-bold text-xs uppercase">
                                    {displayRestaurant?.owner?.name?.charAt(0)}
                                </div>
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
        </div>
    );
}
