'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaHome, FaDollarSign, FaClipboardList, FaHeadset, FaUser, FaStar, FaRoute, FaWallet, FaTrophy } from 'react-icons/fa';
import OrderNotificationModal from './OrderNotificationModal';
import RiderEarnings from './RiderEarnings';
import RiderProfile from './RiderProfile';
import RiderSupport from './RiderSupport';
import RiderOrders from './RiderOrders';

interface RiderDashboardProps {
    riderId?: string;
}

export default function RiderDashboard({ riderId }: RiderDashboardProps) {
    // Get riderId from prop or localStorage
    const getEffectiveRiderId = () => {
        if (riderId) return riderId;
        if (typeof window !== 'undefined') {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            return userInfo.riderId || userInfo._id;
        }
        return '';
    };

    const effectiveRiderId = getEffectiveRiderId();

    const [riderData, setRiderData] = useState<any>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [pendingOrder, setPendingOrder] = useState<any>(null);
    const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);

    useEffect(() => {
        if (!effectiveRiderId) return;

        const fetchRiderData = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/${effectiveRiderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRiderData(res.data);
                setIsOnline(res.data.isOnline);
            } catch (error) {
                console.error('Error fetching rider data:', error);
            }
        };

        const fetchDeliveries = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/${effectiveRiderId}/deliveries`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data) {
                    setRecentDeliveries(res.data);
                }
            } catch (error) {
                console.log('No deliveries yet');
            }
        };

        const checkForNewOrders = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
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

        fetchRiderData();
        fetchDeliveries();

        // Real-time polling every 5 seconds
        const interval = setInterval(() => {
            fetchRiderData();
            fetchDeliveries();
            if (isOnline) {
                checkForNewOrders();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [effectiveRiderId, isOnline, pendingOrder]);

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
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

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
        <div className="min-h-screen bg-gray-50 pb-20">
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

            {/* Header */}
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-pink-600 px-4 pt-6 pb-20 rounded-b-3xl">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-white/90 text-xs font-medium uppercase tracking-wider">Welcome back,</p>
                        <h1 className="text-white text-xl font-bold">{riderData.fullName?.split(' ')[0] || 'Rider'}</h1>
                    </div>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-600 font-bold text-base shadow-lg">
                        {riderData.fullName?.[0] || 'R'}
                    </div>
                </div>

                {/* Online/Offline Toggle */}
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm font-bold">{isOnline ? 'You are Online' : 'You are Offline'}</p>
                        <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{isOnline ? 'Ready for orders' : 'Go online to start earning'}</p>
                    </div>
                    <button
                        onClick={toggleOnlineStatus}
                        className={`relative w-12 h-7 rounded-full transition ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${isOnline ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-4 -mt-12 mb-6">
                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        icon={<FaDollarSign className="text-lg" />}
                        label="Today's Earnings"
                        value={`Rs. ${riderData.earnings?.today || 0}`}
                        bgColor="bg-green-500"
                    />
                    <StatCard
                        icon={<FaClipboardList className="text-lg" />}
                        label="Deliveries"
                        value={riderData.stats?.totalDeliveries || 0}
                        bgColor="bg-blue-500"
                    />
                    <StatCard
                        icon={<FaStar className="text-lg" />}
                        label="Rating"
                        value={riderData.stats?.rating?.toFixed(1) || '0.0'}
                        bgColor="bg-yellow-500"
                    />
                    <StatCard
                        icon={<FaTrophy className="text-lg" />}
                        label="This Week"
                        value={`Rs. ${riderData.earnings?.thisWeek || 0}`}
                        bgColor="bg-purple-500"
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mb-6">
                <h2 className="text-base font-bold text-gray-800 mb-3 uppercase tracking-wider text-[10px]">Quick Actions</h2>
                <div className="space-y-2.5">
                    <ActionItem
                        icon={<FaRoute className="text-orange-600" />}
                        title="Navigate to Order"
                        subtitle="Get directions to pickup location"
                        bgColor="bg-orange-50"
                    />
                    <ActionItem
                        icon={<FaWallet className="text-orange-600" />}
                        title="View Earnings"
                        subtitle="Check your payment details"
                        bgColor="bg-orange-50"
                        onClick={() => setActiveTab('earnings')}
                    />
                    <ActionItem
                        icon={<FaTrophy className="text-orange-600" />}
                        title="Performance"
                        subtitle="See your ratings & stats"
                        bgColor="bg-orange-50"
                    />
                </div>
            </div>

            {/* Recent Deliveries */}
            <div className="px-4 mb-6">
                <h2 className="text-base font-bold text-gray-800 mb-3 uppercase tracking-wider text-[10px]">Recent Deliveries</h2>
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                    {recentDeliveries.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            <p className="text-xs">No deliveries yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {recentDeliveries.map((delivery, idx) => (
                                <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800 text-sm">{delivery.restaurant?.name || 'Restaurant'} <span className="text-gray-400 font-normal text-[10px]">#{delivery.orderNumber}</span></p>
                                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{delivery.timeAgo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600 text-sm">+Rs. {delivery.earnings}</p>
                                        <div className="flex items-center justify-end gap-1 text-yellow-500 text-[10px] mt-0.5 font-bold">
                                            <FaStar size={8} />
                                            <span>{delivery.rating || '5.0'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation */}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
}

function BottomNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-around max-w-2xl mx-auto">
                <NavItem icon={<FaHome />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <NavItem icon={<FaDollarSign />} label="Earnings" active={activeTab === 'earnings'} onClick={() => setActiveTab('earnings')} />
                <NavItem icon={<FaClipboardList />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
                <NavItem icon={<FaHeadset />} label="Support" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
                <NavItem icon={<FaUser />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, bgColor }: { icon: React.ReactNode; label: string; value: string | number; bgColor: string }) {
    return (
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 ${bgColor} rounded-xl flex items-center justify-center text-white mb-2.5 shadow-sm`}>
                {icon}
            </div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
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
            onClick={onClick}
            className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-orange-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <span className="text-lg">{icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
        </button>
    );
}
