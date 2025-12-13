'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
    // ... remainder of file uses riderId, need to change to effectiveRiderId or just use variable

    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [pendingOrder, setPendingOrder] = useState<any>(null);
    const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);

    useEffect(() => {
        const fetchRiderData = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`http://localhost:5000/api/riders/${riderId}`, {
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
                const res = await axios.get(`http://localhost:5000/api/riders/${riderId}/deliveries`, {
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
                const res = await axios.get(`http://localhost:5000/api/riders/${riderId}/available-orders`, {
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
    }, [riderId, isOnline, pendingOrder]);

    const handleAcceptOrder = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.post(`http://localhost:5000/api/riders/${riderId}/accept-order`, {
                orderId: pendingOrder._id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingOrder(null);
        } catch (error) {
            console.error('Error accepting order:', error);
        }
    };

    const handleRejectOrder = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.post(`http://localhost:5000/api/riders/${riderId}/reject-order`, {
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
            await axios.put(`http://localhost:5000/api/riders/${riderId}/status`, {
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
            <>
                <RiderEarnings riderId={riderId} />
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </>
        );
    }

    if (activeTab === 'profile') {
        return (
            <>
                <RiderProfile riderId={riderId} />
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </>
        );
    }

    if (activeTab === 'support') {
        return (
            <>
                <RiderSupport />
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </>
        );
    }

    if (activeTab === 'orders') {
        return (
            <>
                <RiderOrders riderId={riderId} />
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </>
        );
    }

    // Home tab (default)
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
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
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-pink-600 px-6 pt-8 pb-24 rounded-b-3xl">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <p className="text-white/90 text-sm font-light">Welcome back,</p>
                        <h1 className="text-white text-2xl font-bold">{riderData.fullName?.split(' ')[0] || 'Rider'}</h1>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 font-bold text-lg shadow-lg">
                        {riderData.fullName?.[0] || 'R'}
                    </div>
                </div>

                {/* Online/Offline Toggle */}
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-white font-semibold">{isOnline ? 'You are Online' : 'You are Offline'}</p>
                        <p className="text-white/80 text-sm font-light">{isOnline ? 'Ready for orders' : 'Go online to start earning'}</p>
                    </div>
                    <button
                        onClick={toggleOnlineStatus}
                        className={`relative w-14 h-8 rounded-full transition ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${isOnline ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 -mt-16 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <StatCard
                        icon={<FaDollarSign className="text-2xl" />}
                        label="Today's Earnings"
                        value={`PKR ${riderData.earnings?.today || 0}`}
                        bgColor="bg-green-500"
                    />
                    <StatCard
                        icon={<FaClipboardList className="text-2xl" />}
                        label="Deliveries"
                        value={riderData.stats?.totalDeliveries || 0}
                        bgColor="bg-blue-500"
                    />
                    <StatCard
                        icon={<FaStar className="text-2xl" />}
                        label="Rating"
                        value={riderData.stats?.rating?.toFixed(1) || '0.0'}
                        bgColor="bg-yellow-500"
                    />
                    <StatCard
                        icon={<FaTrophy className="text-2xl" />}
                        label="This Week"
                        value={`PKR ${riderData.earnings?.thisWeek || 0}`}
                        bgColor="bg-purple-500"
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
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
            <div className="px-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Deliveries</h2>
                <div className="bg-white rounded-2xl overflow-hidden">
                    {recentDeliveries.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-sm">No deliveries yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {recentDeliveries.map((delivery, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{delivery.restaurant?.name || 'Restaurant'} <span className="text-gray-400 font-normal text-sm">#{delivery.orderNumber}</span></p>
                                        <p className="text-xs text-gray-500">{delivery.timeAgo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-green-600">+PKR {delivery.earnings}</p>
                                        <div className="flex items-center gap-1 text-yellow-500 text-xs mt-1">
                                            <FaStar size={10} />
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 safe-area-pb">
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
        <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center text-white mb-3`}>
                {icon}
            </div>
            <p className="text-gray-500 text-xs font-light mb-1">{label}</p>
            <p className="text-gray-900 text-xl font-bold">{value}</p>
        </div>
    );
}

function ActionItem({ icon, title, subtitle, bgColor, onClick }: { icon: React.ReactNode; title: string; subtitle: string; bgColor: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center text-xl`}>
                {icon}
            </div>
            <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                <p className="text-gray-500 text-xs font-light">{subtitle}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition ${active ? 'text-orange-600' : 'text-gray-400'}`}
        >
            <div className="text-xl">{icon}</div>
            <span className="text-xs font-medium">{label}</span>
            {active && <div className="w-1 h-1 bg-orange-600 rounded-full mt-0.5" />}
        </button>
    );
}
