'use client';

import React, { useState, useEffect } from 'react';
import { FaShoppingBag, FaUtensils, FaStore, FaChartLine, FaDollarSign, FaStar, FaBullhorn, FaHeadset, FaConciergeBell, FaBell, FaClock, FaBox, FaCheck, FaPaperPlane, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
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
import DashboardSupport from './DashboardSupport';
import { io } from 'socket.io-client';
import { getImageUrl } from '../utils/imageUtils';
import { API_BASE_URL, SOCKET_URL } from '../utils/config';

export default function RestaurantDashboard() {
    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [activePage, setActivePage] = useState('orders');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [stats, setStats] = useState({
        pending: 0,
        preparing: 0,
        ready: 0,
        outForDelivery: 0,
    });

    // Socket state
    const [socket, setSocket] = useState<any>(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);
        return () => { newSocket.disconnect(); };
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const headers = { Authorization: `Bearer ${token}` };

            const [restaurantRes, statsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/restaurants/my-restaurant`, { headers }),
                axios.get(`${API_BASE_URL}/api/dashboard/stats`, { headers })
            ]);

            setRestaurant(restaurantRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
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
        socket.emit('join-restaurant', restaurant._id);

        const handleNewOrder = (order: any) => {
            playNotificationSound();
            const newNotification = {
                _id: Date.now().toString(),
                title: 'New Order Received',
                message: `Order #${order._id.slice(-6)} has been placed`,
                createdAt: new Date().toISOString(),
                read: false
            };
            setNotifications(prev => [newNotification, ...prev]);
            fetchDashboardData();
        };

        const handleOrderUpdate = () => fetchDashboardData();

        socket.on('new-order', handleNewOrder);
        socket.on('order-updated', handleOrderUpdate);

        return () => {
            socket.off('new-order', handleNewOrder);
            socket.off('order-updated', handleOrderUpdate);
        };
    }, [socket, restaurant]);

    useEffect(() => {
        fetchDashboardData();
        fetchNotifications();
    }, []);

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
        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);

            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const { data } = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`
                }
            });

            const fullUrl = data.imageUrl;

            // Update restaurant logo in backend
            await axios.put(`${API_BASE_URL}/api/restaurants/store-settings`,
                { logo: fullUrl },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );

            setRestaurant({ ...restaurant, logo: fullUrl });
            onUpdate(); // Ensure this is called if available to refresh state everywhere
            alert('Logo updated successfully!');
        } catch (error) {
            console.error('Logo upload failed:', error);
            alert('Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading your restaurant...</p>
                </div>
            </div>
        );
    }

    if (!restaurant) return <CreateRestaurant onRestaurantCreated={fetchDashboardData} />;

    const isPending = restaurant.verificationStatus === 'pending' || restaurant.verificationStatus === 'not_started';

    const menuItems = [
        { id: 'orders', label: 'Orders Board', icon: FaShoppingBag },
        { id: 'menu', label: 'Menu Items', icon: FaUtensils },
        { id: 'store', label: 'Store Profile', icon: FaStore },
        { id: 'analytics', label: 'Performance', icon: FaChartLine },
        { id: 'payments', label: 'Earnings', icon: FaDollarSign },
        { id: 'reviews', label: 'Customer Reviews', icon: FaStar },
        { id: 'promotions', label: 'Promotions', icon: FaBullhorn },
        { id: 'support', label: 'Help Center', icon: FaHeadset },
        { id: 'settings', label: 'Account Settings', icon: FaClock },
    ];

    const renderContent = () => {
        // Restrictions for pending restaurants
        if (isPending && activePage !== 'settings' && activePage !== 'store' && activePage !== 'support' && activePage !== 'orders') {
            // Redirect to status page fallback
            return (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 max-w-2xl mx-auto">
                    <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 text-4xl shadow-lg shadow-orange-500/20">
                        <FaClock />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Verification In Pending</h2>
                    <p className="text-gray-600 text-lg leading-relaxed mb-8">
                        Your restaurant profile is currently under review by our admin team.
                        This process usually takes <span className="font-bold text-gray-800">24-48 hours</span>.
                    </p>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 w-full text-left">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <FaBell /> What happens next?
                        </h4>
                        <ul className="space-y-3 text-blue-700/80 text-sm">
                            <li className="flex gap-3">
                                <span className="bg-blue-200 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                Our team verifies your documents (CNIC, License, etc.)
                            </li>
                            <li className="flex gap-3">
                                <span className="bg-blue-200 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                You will receive an email/notification once verified
                            </li>
                            <li className="flex gap-3">
                                <span className="bg-blue-200 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                Once approved, you can start managing your menu and receiving orders
                            </li>
                        </ul>
                    </div>
                </div>
            );
        }

        switch (activePage) {
            case 'orders': return <OrderBoard restaurant={restaurant} onUpdate={fetchDashboardData} />;
            case 'menu': return <DashboardMenu restaurant={restaurant} />;
            case 'store': return <DashboardStore restaurant={restaurant} onUpdate={fetchDashboardData} />;
            case 'analytics': return <DashboardAnalytics restaurant={restaurant} />;
            case 'payments': return <PaymentHistory restaurant={restaurant} />;
            case 'reviews': return <DashboardReviews restaurant={restaurant} />;
            case 'promotions': return <DashboardPromotions restaurant={restaurant} />;
            case 'support': return <DashboardSupport />;
            case 'settings': return <DashboardSettings restaurant={restaurant} onUpdate={fetchDashboardData} />;
            default: return <OrderBoard restaurant={restaurant} onUpdate={fetchDashboardData} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-[13px]">
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
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="relative group">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-800 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20">
                                    <img
                                        src={getImageUrl(restaurant.logo) || 'https://via.placeholder.com/150'}
                                        alt="Logo"
                                        className="w-full h-full object-cover"
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
                                    <h2 className="text-sm font-bold truncate leading-tight">{restaurant.name}</h2>
                                    <span className="bg-orange-500/20 text-orange-500 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">v2.6</span>
                                </div>
                                <p className="text-[9px] text-gray-400 truncate flex items-center gap-1.5 mt-0.5 font-bold uppercase tracking-wider">
                                    <span className={`w-1.5 h-1.5 rounded-full ${restaurant.isVerified ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                                    {restaurant.isVerified ? 'Partner' : 'Pending'}
                                </p>
                            </div>
                        </div>

                        {/* Status Stats */}
                        {!isPending && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/30">
                                    <p className="text-[8px] text-gray-500 mb-0.5 font-bold uppercase tracking-wider">Rating</p>
                                    <p className="font-bold text-yellow-400 text-[10px] flex items-center justify-center gap-1">
                                        <FaStar size={8} /> {restaurant.rating || 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/30">
                                    <p className="text-[8px] text-gray-500 mb-0.5 font-bold uppercase tracking-wider">Today</p>
                                    <p className="font-bold text-green-400 text-[10px]">{(stats?.ready || 0) + (stats?.outForDelivery || 0)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 custom-scrollbar">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                disabled={item.disabled}
                                onClick={() => {
                                    setActivePage(item.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative
                                ${
                                    activePage === item.id
                                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                                        : item.disabled
                                            ? 'text-gray-600 opacity-40 cursor-not-allowed'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                            >
                                <item.icon className={`text-sm ${activePage === item.id ? 'text-white' : 'text-gray-500 group-hover:text-orange-400'}`} />
                                <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
                                {item.disabled && (
                                    <div className="ml-auto">
                                        <FaTimes className="text-[8px]" />
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
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest"
                        >
                            <FaSignOutAlt /> Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Desktop Header */}
                <header className="bg-white border-b border-gray-100 p-4 hidden lg:flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                            {menuItems.find((i) => i.id === activePage)?.label}
                        </h1>
                        <div className="h-6 w-[1px] bg-gray-200" />
                        <p className="text-gray-500 text-xs">
                            Welcome back, {restaurant.owner?.name?.split(' ')[0] || 'Partner'}
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
                                <p className="text-xs font-bold text-gray-900 leading-none">{restaurant.owner?.name}</p>
                                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">Restaurant Owner</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-orange-400 p-[2px] shadow-md">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-orange-500 font-bold text-xs uppercase">
                                    {restaurant.owner?.name?.charAt(0)}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-100 p-4 lg:hidden flex items-center justify-between shadow-sm shrink-0">
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
                    <div className="bg-orange-500 text-white px-6 py-2.5 text-xs font-medium flex items-center justify-between z-20 shadow-md shrink-0">
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

                <div className="flex-1 overflow-hidden bg-gray-50/50 flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 max-w-7xl mx-auto w-full">
                        <motion.div
                            key={activePage}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
}
