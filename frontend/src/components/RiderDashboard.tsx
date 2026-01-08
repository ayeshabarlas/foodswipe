'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaHome, FaDollarSign, FaClipboardList, FaHeadset, FaUser, FaStar, FaRoute, FaWallet, FaTrophy, FaBell, FaBan, FaClock, FaMapMarkerAlt, FaChevronRight } from 'react-icons/fa';
import { AnimatePresence } from 'framer-motion';
import OrderNotificationModal from './OrderNotificationModal';
import RiderEarnings from './RiderEarnings';
import RiderProfile from './RiderProfile';
import RiderSupport from './RiderSupport';
import RiderOrders from './RiderOrders';
import NotificationPanel from './NotificationPanel';

interface RiderDashboardProps {
    riderId?: string;
}

export default function RiderDashboard({ riderId }: RiderDashboardProps) {
    // Get riderId from prop or localStorage
    const getEffectiveRiderId = () => {
        if (riderId) return riderId;
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('userInfo');
            if (!userStr) return '';
            try {
                const userInfo = JSON.parse(userStr);
                return userInfo.riderId || userInfo._id || '';
            } catch (e) {
                return '';
            }
        }
        return '';
    };

    const effectiveRiderId = getEffectiveRiderId();

    const [riderData, setRiderData] = useState<any>(null);
    const [loading, setLoading] = useState(false); // Start as false to avoid initial flash if not needed
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [pendingOrder, setPendingOrder] = useState<any>(null);
    const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    const fetchUnreadCount = async () => {
        try {
            const userStr = localStorage.getItem("userInfo");
            if (!userStr || userStr === 'undefined') return;
            const token = JSON.parse(userStr).token;
            if (!token) return;
            
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const unread = res.data.filter((n: any) => !n.read).length;
            setUnreadNotifications(unread);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    useEffect(() => {
        if (!effectiveRiderId) return;

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [effectiveRiderId]);

    useEffect(() => {
        if (!effectiveRiderId) return;

        const fetchRiderData = async (showLoading = false) => {
            try {
                if (showLoading) setLoading(true);
                const userStr = localStorage.getItem("userInfo");
                if (!userStr || userStr === 'undefined') {
                    setLoading(false);
                    return;
                }
                const token = JSON.parse(userStr).token;
                if (!token) {
                    setLoading(false);
                    return;
                }

                const res = await axios.get(`${API_BASE_URL}/api/riders/${effectiveRiderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRiderData(res.data);
                setIsOnline(res.data.isOnline);
                localStorage.setItem('rider_online_status', JSON.stringify(res.data.isOnline));
                setError(null);
            } catch (error: any) {
                console.error('Error fetching rider data:', error);
                if (!riderData) {
                    setError(error.response?.data?.message || 'Failed to load rider data');
                }
            } finally {
                if (showLoading) setLoading(false);
            }
        };

        const fetchDeliveries = async () => {
            try {
                const userStr = localStorage.getItem("userInfo");
                if (!userStr || userStr === 'undefined') return;
                const token = JSON.parse(userStr).token;
                if (!token) return;

                const res = await axios.get(`${API_BASE_URL}/api/riders/${effectiveRiderId}/deliveries`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data) {
                    setRecentDeliveries(res.data);
                }
            } catch (error) {
                // No deliveries yet
            }
        };

        const checkForNewOrders = async () => {
            try {
                const userStr = localStorage.getItem("userInfo");
                if (!userStr || userStr === 'undefined') return;
                const token = JSON.parse(userStr).token;
                if (!token) return;

                const res = await axios.get(`${API_BASE_URL}/api/riders/${effectiveRiderId}/available-orders`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data && res.data.length > 0 && !pendingOrder) {
                    setPendingOrder(res.data[0]);
                }
            } catch (error) {
                // No new orders available
            }
        };

        fetchRiderData(true);
        fetchDeliveries();

        // Check if we need to auto-create profile (if data still null after 2s)
        const timeout = setTimeout(() => {
            if (!riderData && !error && loading) {
                console.log("Still loading, retrying fetch...");
                fetchRiderData(true);
            }
        }, 2000);

        // Real-time polling every 5 seconds (background)
        const interval = setInterval(() => {
            fetchRiderData(false);
            fetchDeliveries();
            // Use the latest isOnline from state indirectly or check it here
            let currentIsOnline = false;
            try {
                const status = localStorage.getItem('rider_online_status');
                if (status && status !== 'undefined') {
                    currentIsOnline = JSON.parse(status);
                }
            } catch (e) {
                console.error('Error parsing online status:', e);
            }
            
            if (currentIsOnline) {
                checkForNewOrders();
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [effectiveRiderId]); // Only depend on effectiveRiderId to avoid loops

    const handleAcceptOrder = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.post(`${API_BASE_URL}/api/riders/${effectiveRiderId}/accept-order`, {
                orderId: pendingOrder._id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingOrder(null);
            setActiveTab('orders');
        } catch (error) {
            console.error('Error accepting order:', error);
        }
    };

    const handleRejectOrder = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.post(`${API_BASE_URL}/api/riders/${effectiveRiderId}/reject-order`, {
                orderId: pendingOrder._id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingOrder(null);
        } catch (error) {
            console.error('Error rejecting order:', error);
        }
    };

    const toggleOnlineStatus = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            const newStatus = !isOnline;
            await axios.put(`${API_BASE_URL}/api/riders/${effectiveRiderId}/status`, {
                isOnline: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsOnline(newStatus);
            localStorage.setItem('rider_online_status', JSON.stringify(newStatus));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    if (!effectiveRiderId) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <FaUser size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Rider ID not found</h2>
                <p className="text-gray-500 mb-6">Please login again to access your dashboard.</p>
                <button 
                    onClick={() => window.location.href = '/login'}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    if (loading && !riderData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500 font-medium">Loading your dashboard...</p>
            </div>
        );
    }

    if (error && !riderData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <FaBan size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
                <p className="text-gray-500 mb-6">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!riderData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    // Page switching
    if (activeTab === 'earnings') {
        return (
            <div className="flex flex-col min-h-screen">
                {riderData?.user?.status === 'suspended' && (
                    <div className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-between sticky top-0 z-[100] shadow-lg">
                        <div className="flex items-center gap-2">
                            <FaBan />
                            <span>ACCOUNT SUSPENDED</span>
                        </div>
                    </div>
                )}
                <RiderEarnings riderId={effectiveRiderId} />
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        );
    }

    if (activeTab === 'profile') {
        return (
            <div className="flex flex-col min-h-screen">
                {riderData?.user?.status === 'suspended' && (
                    <div className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-between sticky top-0 z-[100] shadow-lg">
                        <div className="flex items-center gap-2">
                            <FaBan />
                            <span>ACCOUNT SUSPENDED</span>
                        </div>
                    </div>
                )}
                <RiderProfile riderId={effectiveRiderId} />
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        );
    }

    if (activeTab === 'support') {
        return (
            <div className="flex flex-col min-h-screen">
                {riderData?.user?.status === 'suspended' && (
                    <div className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-between sticky top-0 z-[100] shadow-lg">
                        <div className="flex items-center gap-2">
                            <FaBan />
                            <span>ACCOUNT SUSPENDED</span>
                        </div>
                    </div>
                )}
                <RiderSupport />
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        );
    }

    if (activeTab === 'orders') {
        return (
            <div className="flex flex-col min-h-screen">
                {riderData?.user?.status === 'suspended' && (
                    <div className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-between sticky top-0 z-[100] shadow-lg">
                        <div className="flex items-center gap-2">
                            <FaBan />
                            <span>ACCOUNT SUSPENDED</span>
                        </div>
                    </div>
                )}
                <RiderOrders riderId={effectiveRiderId} />
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        );
    }

    // Home tab (default)
    return (
        <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
            {/* Account Status Banner */}
            {riderData?.user?.status === 'suspended' && (
                <div className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-between sticky top-0 z-[100] shadow-lg">
                    <div className="flex items-center gap-2">
                        <FaBan />
                        <span>YOUR ACCOUNT HAS BEEN SUSPENDED. Please contact support.</span>
                    </div>
                </div>
            )}
            
            {/* Order Notification Modal */}
            {pendingOrder && (
                <OrderNotificationModal
                    order={pendingOrder}
                    onAccept={handleAcceptOrder}
                    onReject={handleRejectOrder}
                    onClose={() => setPendingOrder(null)}
                />
            )}

            {/* Header - Screenshot Style */}
            <div className="bg-gradient-to-br from-[#FF4D00] to-[#FF007A] px-6 pt-8 pb-24 rounded-b-[40px] shadow-lg relative">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-white text-3xl font-black tracking-tight mb-1">Available Orders</h1>
                        <p className="text-white/80 text-sm font-medium">6 orders near you</p>
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setShowNotifications(true)}
                            className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white relative hover:bg-white/30 transition-colors"
                        >
                            <FaBell size={20} />
                            {unreadNotifications > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#FF4D00] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {unreadNotifications}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {showNotifications && (
                        <NotificationPanel 
                            riderId={effectiveRiderId} 
                            onClose={() => setShowNotifications(false)} 
                            onReadUpdate={fetchUnreadCount}
                        />
                    )}
                </AnimatePresence>

                {/* Potential Earnings Card */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[28px] p-6 flex items-center justify-between">
                    <div>
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-[2px] mb-2">Potential Earnings</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-white text-3xl font-black">PKR 1590</span>
                        </div>
                    </div>
                    <div className="w-14 h-14 bg-[#00D97E] rounded-full flex items-center justify-center shadow-lg shadow-[#00D97E]/30">
                        <FaDollarSign className="text-white text-2xl" />
                    </div>
                </div>
            </div>

            {/* Order Filter Tabs */}
            <div className="px-6 -mt-8 mb-6 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 pb-2">
                    <button className="bg-gradient-to-r from-[#FF4D00] to-[#FF007A] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg flex items-center gap-2 shrink-0">
                        All Orders <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px]">6</span>
                    </button>
                    <button className="bg-white text-gray-400 px-6 py-3 rounded-2xl font-bold text-sm border border-gray-100 flex items-center gap-2 shrink-0">
                        Nearby <span className="bg-gray-100 px-2 py-0.5 rounded-lg text-[10px] text-gray-500">2</span>
                    </button>
                    <button className="bg-white text-gray-400 px-6 py-3 rounded-2xl font-bold text-sm border border-gray-100 flex items-center gap-2 shrink-0">
                        High Pay
                    </button>
                </div>
            </div>

            {/* Available Orders List - Real Time */}
            <div className="px-6 space-y-4 mb-24">
                {recentDeliveries.length > 0 ? (
                    recentDeliveries.map((order, idx) => (
                        <div key={idx} className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 relative overflow-hidden group active:scale-[0.98] transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 bg-red-50 text-[#FF4D00] px-3 py-1 rounded-full mb-3">
                                        <FaClock size={10} className="animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Urgent</span>
                                    </div>
                                    <h3 className="text-gray-900 text-lg font-black tracking-tight mb-1">{order.restaurant?.name || 'Pizza House'}</h3>
                                    <p className="text-gray-400 text-xs font-medium">{order.timeAgo || '2 mins ago'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#00D97E] text-lg font-black tracking-tight">+PKR {order.earnings || 250}</p>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">3 items</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-500 shrink-0">
                                        <FaMapMarkerAlt size={14} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">Pickup</p>
                                        <p className="text-gray-900 text-xs font-bold line-clamp-1">{order.restaurant?.address || 'Block 5, Gulshan-e-Iqbal'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 shrink-0">
                                        <FaMapMarkerAlt size={14} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">Delivery</p>
                                        <p className="text-gray-900 text-xs font-bold line-clamp-1">Apartment 204, DHA Phase 2</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <FaRoute size={14} />
                                        <span className="text-xs font-bold">3.2 km</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <FaClock size={14} />
                                        <span className="text-xs font-bold">15 min</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setPendingOrder(order)}
                                    className="text-[#FF4D00] text-sm font-black flex items-center gap-1 group-hover:gap-2 transition-all"
                                >
                                    View Details <FaChevronRight size={10} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <FaClipboardList size={32} />
                        </div>
                        <h3 className="text-gray-900 font-bold mb-1">No orders available</h3>
                        <p className="text-gray-400 text-xs">Orders near you will appear here in real-time</p>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
}

function BottomNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[999]">
            <div className="flex items-center justify-around max-w-2xl mx-auto">
                <NavItem icon={<FaHome />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <NavItem icon={<FaDollarSign />} label="Earnings" active={activeTab === 'earnings'} onClick={() => setActiveTab('earnings')} />
                <NavItem icon={<FaClipboardList />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
                <NavItem icon={<FaHeadset />} label="Support" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
                <NavItem icon={<FaUser />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </div>

            {/* Bottom Navigation */}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
}

function StatCard({ icon, label, value, bgColor }: { icon: React.ReactNode; label: string; value: string | number; bgColor: string }) {
    return (
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 ${bgColor} rounded-xl flex items-center justify-center text-white mb-2.5 shadow-sm`}>
                {icon}
            </div>
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-gray-800 text-lg font-bold">{value}</p>
        </div>
    );
}

function ActionItem({ icon, title, subtitle, bgColor, onClick }: { icon: React.ReactNode; title: string; subtitle: string; bgColor: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} className="w-full bg-white rounded-2xl p-3.5 shadow-sm hover:shadow-md transition flex items-center gap-3.5 border border-gray-100 group">
            <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-110`}>
                {icon}
            </div>
            <div className="flex-1 text-left">
                <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                <p className="text-gray-400 text-[10px] font-medium">{subtitle}</p>
            </div>
        </button>
    );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`flex flex-col items-center gap-1 transition-all py-1 px-2 ${active ? 'text-orange-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <span className="text-lg">{icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
        </button>
    );
}
