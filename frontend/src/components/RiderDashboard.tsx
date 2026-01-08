'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaHome, FaShoppingBag, FaBox, FaWallet, FaUser,
    FaStar, FaClock, FaMapMarkerAlt, FaChevronRight,
    FaBell, FaCheckCircle, FaExclamationCircle, FaTimes,
    FaMotorcycle, FaArrowRight, FaLocationArrow
} from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import RiderOrders from './RiderOrders';
import RiderEarnings from './RiderEarnings';
import RiderProfile from './RiderProfile';

const RiderDashboard = ({ riderId: initialRiderId }: { riderId?: string }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [orderFilter, setOrderFilter] = useState('all');
    const [riderData, setRiderData] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const [newOrderPopup, setNewOrderPopup] = useState<any>(null);
    const [timer, setTimer] = useState(15);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchRiderData = async () => {
        try {
            const userStr = localStorage.getItem('userInfo');
            if (!userStr) return;
            const userInfo = JSON.parse(userStr);
            const token = userInfo.token;
            
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Fetch profile and orders in parallel
            const [profileRes, ordersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/riders/my-profile`, config),
                axios.get(`${API_BASE_URL}/api/riders/orders`, config).catch(() => ({ data: [] }))
            ]);

            setRiderData(profileRes.data);
            setOrders(ordersRes.data || []);
            setIsOnline(profileRes.data.isOnline || false);
            setLoading(false);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching rider data:', err);
            setError(err.response?.data?.message || 'Failed to load profile');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRiderData();
        
        // Hide scrollbar style
        const style = document.createElement('style');
        style.innerHTML = `
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // New Order Popup Timer Logic
    useEffect(() => {
        let interval: any;
        if (newOrderPopup && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setNewOrderPopup(null);
            setTimer(15);
        }
        return () => clearInterval(interval);
    }, [newOrderPopup, timer]);

    const handleToggleOnline = async () => {
        try {
            const userStr = localStorage.getItem('userInfo');
            if (!userStr || !riderData?._id) return;
            const userInfo = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            
            await axios.put(`${API_BASE_URL}/api/riders/${riderData._id}/status`, { isOnline: !isOnline }, config);
            setIsOnline(!isOnline);
        } catch (err) {
            console.error('Status update failed', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
                <p className="text-red-500 font-bold mb-4">{error}</p>
                <button 
                    onClick={fetchRiderData}
                    className="px-8 py-3 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200"
                >
                    Retry
                </button>
            </div>
        );
    }

    const renderHome = () => (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-light">
            {/* Gradient Header */}
            <div className="relative bg-[#008C44] rounded-b-[40px] px-6 pt-12 pb-14 -mx-4 -mt-4 shadow-lg overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-black/5 rounded-full blur-2xl" />
                
                <div className="relative flex justify-between items-start mb-8 z-10">
                    <div>
                        <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Welcome back,</p>
                        <h1 className="text-white text-3xl font-bold tracking-tight">{riderData?.fullName || riderData?.user?.name || 'Rider'}</h1>
                    </div>
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-xl">
                        {(riderData?.fullName || riderData?.user?.name || 'R')[0]}
                    </div>
                </div>

                {/* Status Toggle Card */}
                <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-[28px] p-6 flex items-center justify-between shadow-xl z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#FFD700] shadow-[0_0_8px_#FFD700]' : 'bg-white/40'}`} />
                            <p className="text-white font-bold text-lg tracking-tight">You are {isOnline ? 'Online' : 'Offline'}</p>
                        </div>
                        <p className="text-white/70 text-xs font-medium">{isOnline ? 'Looking for new orders' : 'Go online to start earning'}</p>
                    </div>
                    <button 
                        onClick={handleToggleOnline}
                        className={`relative w-16 h-8 rounded-full transition-all duration-500 shadow-inner ${isOnline ? 'bg-[#FFD700]' : 'bg-white/20'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-md transform ${isOnline ? 'translate-x-9' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <DashboardStat 
                    icon={<FaWallet size={18} />} 
                    label="Today's Earnings" 
                    value={`PKR ${riderData?.earnings?.today || 0}`} 
                    color="text-[#008C44]" 
                    bgColor="bg-green-50" 
                />
                <DashboardStat 
                    icon={<FaBox size={18} />} 
                    label="Deliveries" 
                    value={riderData?.totalOrders || 0} 
                    color="text-blue-500" 
                    bgColor="bg-blue-50" 
                />
                <DashboardStat 
                    icon={<FaStar size={18} />} 
                    label="Rating" 
                    value={riderData?.rating || 'New'} 
                    color="text-[#FFD700]" 
                    bgColor="bg-yellow-50" 
                />
                <DashboardStat 
                    icon={<FaClock size={18} />} 
                    label="This Week" 
                    value={`PKR ${riderData?.earnings?.thisWeek || 0}`} 
                    color="text-purple-500" 
                    bgColor="bg-purple-50" 
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 px-2">Quick Actions</h3>
                <div className="bg-white rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 overflow-hidden">
                    <ActionItem 
                        icon={<FaLocationArrow size={18} />} 
                        label="Navigate to Order" 
                        sublabel="Get directions to pickup" 
                        onClick={() => {}} 
                    />
                    <ActionItem 
                        icon={<FaWallet size={18} />} 
                        label="View Earnings" 
                        sublabel="Check your payment details" 
                        onClick={() => setActiveTab('earnings')} 
                    />
                    <ActionItem 
                        icon={<FaStar size={18} />} 
                        label="Performance" 
                        sublabel="See your ratings & stats" 
                        onClick={() => setActiveTab('profile')} 
                    />
                </div>
            </div>

            {/* Recent Deliveries */}
            <div className="pb-4">
                <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 px-2">Recent Deliveries</h3>
                <div className="flex flex-col gap-3">
                    {riderData?.recentOrders?.length > 0 ? (
                        riderData.recentOrders.map((order: any, idx: number) => (
                            <div key={idx} className="bg-white p-5 rounded-[28px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 flex justify-between items-center group active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-[#008C44] transition-all">
                                        <FaShoppingBag size={18} />
                                    </div>
                                    <div>
                                        <p className="text-gray-900 font-bold text-sm tracking-tight">{order.restaurantName}</p>
                                        <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mt-0.5">#{order.orderId} • {order.timeAgo}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#008C44] font-bold text-sm">+PKR {order.earning}</p>
                                    <div className="flex items-center gap-1 justify-end mt-0.5">
                                        <FaStar className="text-[#FFD700]" size={10} />
                                        <p className="text-gray-400 text-[10px] font-bold">{order.rating}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-10 rounded-[32px] border border-dashed border-gray-200 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaBox className="text-gray-200" size={24} />
                            </div>
                            <p className="text-gray-400 text-xs font-medium">No recent deliveries yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

function DashboardStat({ icon, label, value, color, bgColor }: any) {
    return (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 flex flex-col gap-4">
            <div className={`w-12 h-12 ${bgColor} ${color} rounded-2xl flex items-center justify-center shadow-sm`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
                <p className="text-gray-900 text-lg font-bold tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function ActionItem({ icon, label, sublabel, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-b-0 group"
        >
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#008C44]/10 group-hover:text-[#008C44] transition-all shadow-sm">
                {icon}
            </div>
            <div className="flex-1 text-left">
                <p className="text-gray-900 font-bold text-sm tracking-tight">{label}</p>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mt-0.5">{sublabel}</p>
            </div>
            <FaChevronRight className="text-gray-300 group-hover:text-[#008C44] transition-all text-xs" />
        </button>
    );
}

    const renderOrders = () => {
        const availableOrders = orders.filter(o => o.status === 'Ready' || o.status === 'OnTheWay');
        const activeOrders = orders.filter(o => o.status === 'PickedUp');

        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-light">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Orders</h2>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">Manage your deliveries</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                        <button 
                            onClick={() => setOrderFilter('available')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${orderFilter === 'available' ? 'bg-white text-[#008C44] shadow-sm' : 'text-gray-400'}`}
                        >
                            Available
                        </button>
                        <button 
                            onClick={() => setOrderFilter('active')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${orderFilter === 'active' ? 'bg-white text-[#008C44] shadow-sm' : 'text-gray-400'}`}
                        >
                            Active
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {(orderFilter === 'available' ? availableOrders : activeOrders).length > 0 ? (filter === 'available' ? availableOrders : activeOrders).map((order) => (
                        <div key={order._id} className="bg-white p-6 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 flex flex-col gap-6 group hover:border-[#008C44]/20 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-[#008C44] transition-all">
                                        <FaShoppingBag size={22} />
                                    </div>
                                    <div>
                                        <p className="text-gray-900 font-bold text-lg tracking-tight">{order.restaurant?.name || 'Restaurant'}</p>
                                        <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mt-0.5">#{order._id.slice(-6)} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="px-3 py-1 bg-green-50 text-[#008C44] rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    {order.status}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mt-0.5">
                                        <FaLocationArrow size={10} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Pickup</p>
                                        <p className="text-gray-900 text-xs font-medium mt-0.5">{order.restaurant?.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mt-0.5">
                                        <FaMapMarkerAlt size={10} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Delivery</p>
                                        <p className="text-gray-900 text-xs font-medium mt-0.5">{order.shippingAddress?.address}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => {}} 
                                    className="flex-1 bg-gray-50 text-gray-900 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                                >
                                    Details
                                </button>
                                <button 
                                    onClick={() => handleUpdateStatus(order._id, order.status === 'Ready' || order.status === 'OnTheWay' ? 'PickedUp' : 'Delivered')}
                                    className="flex-[2] bg-[#008C44] text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    {order.status === 'PickedUp' ? 'Mark Delivered' : 'Accept Order'}
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white p-12 rounded-[40px] border border-dashed border-gray-200 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaBox className="text-gray-200" size={32} />
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg mb-2">No {orderFilter} orders</h3>
                            <p className="text-gray-400 text-xs font-medium px-8">Stay online to receive new delivery requests in your area</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-32 font-light">
            <div className="max-w-md mx-auto px-4 pt-4">
                {activeTab === 'home' && renderHome()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'earnings' && <RiderEarnings riderId={riderData?._id} />}
                {activeTab === 'profile' && <RiderProfile riderId={riderData?._id} />}
            </div>

            {/* Figma Aligned Bottom Navigation */}
            <div className="fixed bottom-6 left-4 right-4 z-50">
                <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[32px] p-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                    <NavButton 
                        active={activeTab === 'home'} 
                        onClick={() => setActiveTab('home')} 
                        icon={<FaHome size={18} />} 
                        label="Home" 
                    />
                    <NavButton 
                        active={activeTab === 'orders'} 
                        onClick={() => setActiveTab('orders')} 
                        icon={<FaBox size={18} />} 
                        label="Orders" 
                    />
                    <NavButton 
                        active={activeTab === 'earnings'} 
                        onClick={() => setActiveTab('earnings')} 
                        icon={<FaWallet size={18} />} 
                        label="Earnings" 
                    />
                    <NavButton 
                        active={activeTab === 'profile'} 
                        onClick={() => setActiveTab('profile')} 
                        icon={<FaUser size={18} />} 
                        label="Profile" 
                    />
                </div>
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon, label }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center gap-1.5 px-6 py-3 rounded-2xl transition-all duration-300 ${active ? 'bg-[#008C44] text-white shadow-lg shadow-green-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <div className={`${active ? 'scale-110' : ''} transition-transform`}>
                {icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        </button>
    );
}

export default RiderDashboard;
