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
import { initSocket, getSocket } from '../utils/socket';
import RiderOrders from './RiderOrders';
import RiderEarnings from './RiderEarnings';
import RiderProfile from './RiderProfile';

const RiderDashboard = ({ riderId: initialRiderId }: { riderId?: string }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [orderFilter, setOrderFilter] = useState('available');
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
                axios.get(`${API_BASE_URL}/api/riders/${userInfo._id}/orders`, config).catch(() => ({ data: [] }))
            ]);

            setRiderData(profileRes.data);
            setOrders(ordersRes.data || []);
            setIsOnline(profileRes.data.isOnline || false);
            
            // Find if there's an active order being delivered
            const currentActive = (ordersRes.data || []).find((o: any) => o.status === 'Picked Up' || o.status === 'OnTheWay');
            if (currentActive) setActiveOrder(currentActive);

            setLoading(false);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching rider data:', err);
            setError(err.response?.data?.message || 'Failed to load profile');
            setLoading(false);
        }
    };

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
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

    // Socket and Geolocation Logic
    useEffect(() => {
        if (!riderData?.user?._id) return;

        const socket = initSocket(riderData.user._id, 'rider', undefined, riderData._id);

        if (socket) {
            socket.on('newOrderAvailable', (order) => {
                console.log('New order available for rider:', order);
                if (isOnline) {
                    setNewOrderPopup(order);
                    setTimer(60); // Set to 60s as per screenshot
                    playNotificationSound();
                }
            });

            socket.on('orderStatusUpdate', (updatedOrder) => {
                console.log('Order status update received:', updatedOrder);
                setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
                if (activeOrder?._id === updatedOrder._id) {
                    setActiveOrder(updatedOrder);
                }
            });
        }

        let watchId: number;

        if (isOnline && activeOrder) {
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        console.log('Sending rider location:', latitude, longitude);
                        socket?.emit('updateRiderLocation', {
                            orderId: activeOrder._id,
                            location: { lat: latitude, lng: longitude }
                        });
                    },
                    (error) => console.error('Geolocation error:', error),
                    { enableHighAccuracy: true, distanceFilter: 10 }
                );
            }
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isOnline, activeOrder, riderData]);

    const handleUpdateStatus = async (orderId: string, status: string) => {
        try {
            const userStr = localStorage.getItem('userInfo');
            if (!userStr) return;
            const userInfo = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const { data } = await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { status }, config);
            
            // Update local state
            setOrders(prev => prev.map(o => o._id === orderId ? data : o));
            
            if (status === 'Picked Up' || status === 'OnTheWay') {
                setActiveOrder(data);
            } else if (status === 'Delivered') {
                setActiveOrder(null);
            }

            // Emit status update via socket
            const socket = getSocket();
            socket?.emit('updateOrderStatus', { orderId, status });

        } catch (err) {
            console.error('Failed to update order status:', err);
        }
    };

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
            {/* SS-style Gradient Header */}
            <div className="bg-gradient-to-br from-orange-500 to-rose-500 px-6 pt-12 pb-32 -mx-4 -mt-4 rounded-b-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl" />
                
                <div className="relative z-10 flex justify-between items-center mb-8">
                    <div>
                        <p className="text-white/80 text-[10px] font-light mb-1">Welcome back,</p>
                        <h1 className="text-white text-2xl font-medium tracking-tight">{riderData?.fullName || riderData?.user?.name || 'Rider'}</h1>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-500 font-medium text-lg shadow-xl border-4 border-white/20">
                        {(riderData?.fullName || riderData?.user?.name || 'R')[0]}
                    </div>
                </div>

                {/* SS-style Status Toggle */}
                <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-[32px] p-6 flex items-center justify-between border border-white/20">
                    <div>
                        <p className="text-white text-base font-light tracking-tight">You are {isOnline ? 'Online' : 'Offline'}</p>
                        <p className="text-white/70 text-[10px] font-extralight">{isOnline ? 'Looking for new orders' : 'Go online to start earning'}</p>
                    </div>
                    <button 
                        onClick={handleToggleOnline}
                        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${isOnline ? 'bg-white' : 'bg-white/30'}`}
                    >
                        <div className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 shadow-sm transform ${isOnline ? 'translate-x-7 bg-orange-500' : 'translate-x-0.5 bg-white'}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid - Overlapping Header */}
            <div className="grid grid-cols-2 gap-4 -mt-20 relative z-20 px-2">
                <DashboardStat 
                    icon={<FaWallet size={18} />} 
                    label="Today's Earnings" 
                    value={`PKR ${riderData?.earnings?.today || 0}`} 
                    color="text-green-500" 
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
                    value={riderData?.rating || '4.8'} 
                    color="text-orange-500" 
                    bgColor="bg-orange-50" 
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
            <div className="mt-4">
                <h3 className="text-gray-400 font-light text-[11px] uppercase tracking-widest mb-4 px-4">Quick Actions</h3>
                <div className="bg-white rounded-[35px] shadow-[0_10px_40px_rgba(0,0,0,0.02)] border border-gray-50 overflow-hidden">
                    <ActionItem 
                        icon={<FaLocationArrow size={16} />} 
                        label="Navigate to Order" 
                        sublabel="Get directions to pickup location" 
                        onClick={() => {}} 
                    />
                    <ActionItem 
                        icon={<FaWallet size={16} />} 
                        label="View Earnings" 
                        sublabel="Check your payment details" 
                        onClick={() => setActiveTab('earnings')} 
                    />
                    <ActionItem 
                        icon={<FaStar size={16} />} 
                        label="Performance" 
                        sublabel="See your ratings & stats" 
                        onClick={() => setActiveTab('profile')} 
                    />
                </div>
            </div>
        </div>
    );

function DashboardStat({ icon, label, value, color, bgColor }: any) {
    return (
        <div className="bg-white p-5 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.01)] border border-gray-50 flex flex-col gap-3">
            <div className={`w-10 h-10 ${bgColor} ${color} rounded-2xl flex items-center justify-center`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-[9px] font-light uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-gray-900 text-base font-medium tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function ActionItem({ icon, label, sublabel, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center gap-5 p-5 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-b-0 group"
        >
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-orange-500 group-hover:bg-orange-50 transition-all">
                <div className="text-lg">{icon}</div>
            </div>
            <div className="flex-1 text-left">
                <p className="text-gray-800 font-medium text-sm tracking-tight">{label}</p>
                <p className="text-gray-400 text-[10px] font-light mt-0.5">{sublabel}</p>
            </div>
        </button>
    );
}

    const renderOrders = () => {
        const availableOrders = orders.filter(o => o.status === 'Ready' || o.status === 'OnTheWay');
        const activeOrders = orders.filter(o => o.status === 'Picked Up');

        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-light pb-20">
                <div className="flex justify-between items-end mb-4 px-2">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Orders</h2>
                        <p className="text-gray-400 text-xs font-light uppercase tracking-widest mt-1">Manage deliveries</p>
                    </div>
                    <div className="flex bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100">
                        <button 
                            onClick={() => setOrderFilter('available')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${orderFilter === 'available' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}
                        >
                            Available
                        </button>
                        <button 
                            onClick={() => setOrderFilter('active')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${orderFilter === 'active' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}
                        >
                            Active
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-5">
                    {(orderFilter === 'available' ? availableOrders : activeOrders).length > 0 ? (orderFilter === 'available' ? availableOrders : activeOrders).map((order: any) => (
                        <div key={order._id} className="bg-white p-6 rounded-[40px] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-50 flex flex-col gap-6 group hover:border-orange-500/20 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-all">
                                        <FaShoppingBag size={22} />
                                    </div>
                                    <div>
                                        <p className="text-gray-900 font-bold text-lg tracking-tight">{order.restaurant?.name || 'Restaurant'}</p>
                                        <p className="text-gray-400 text-[10px] font-light uppercase tracking-widest mt-1">#{order._id.slice(-6)} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                    {order.status}
                                </div>
                            </div>

                            <div className="space-y-5 px-1">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 mt-0.5">
                                        <FaLocationArrow size={12} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Pickup</p>
                                        <p className="text-gray-900 text-sm font-medium leading-relaxed">{order.restaurant?.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 mt-0.5">
                                        <FaMapMarkerAlt size={12} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Delivery</p>
                                        <p className="text-gray-900 text-sm font-medium leading-relaxed">{order.shippingAddress?.address}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => {}} 
                                    className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                                >
                                    Details
                                </button>
                                <button 
                                    onClick={() => handleUpdateStatus(order._id, order.status === 'Ready' || order.status === 'OnTheWay' ? 'Picked Up' : 'Delivered')}
                                    className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    {order.status === 'Picked Up' ? 'Mark Delivered' : 'Accept Order'}
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white p-12 rounded-[40px] border border-dashed border-gray-200 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaBox className="text-gray-200" size={32} />
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg mb-2">No {orderFilter} orders</h3>
                            <p className="text-gray-400 text-xs font-light px-8">Stay online to receive new delivery requests in your area</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-32 font-light overflow-x-hidden">
            <div className="max-w-md mx-auto px-4 pt-4">
                {activeTab === 'home' && renderHome()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'earnings' && <RiderEarnings riderId={riderData?._id} />}
                {activeTab === 'profile' && <RiderProfile riderId={riderData?._id} />}
            </div>

            {/* SS-style Bottom Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/80 backdrop-blur-xl rounded-[35px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 p-2 z-50">
                <div className="flex justify-around items-center">
                    <NavButton 
                        active={activeTab === 'home'} 
                        onClick={() => setActiveTab('home')} 
                        icon={<FaHome size={20} />} 
                        label="Home" 
                    />
                    <NavButton 
                        active={activeTab === 'earnings'} 
                        onClick={() => setActiveTab('earnings')} 
                        icon={<FaWallet size={20} />} 
                        label="Earnings" 
                    />
                    <NavButton 
                        active={activeTab === 'orders'} 
                        onClick={() => setActiveTab('orders')} 
                        icon={<FaBox size={20} />} 
                        label="Order" 
                    />
                    <NavButton 
                        active={activeTab === 'profile'} 
                        onClick={() => setActiveTab('profile')} 
                        icon={<FaUser size={20} />} 
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
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 rounded-[28px] ${
                active 
                ? 'bg-orange-500 text-white px-6 py-3 shadow-lg shadow-orange-200' 
                : 'text-gray-400 px-4 py-3'
            }`}
        >
            <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
                {icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'block' : 'hidden sm:block'}`}>
                {label}
            </span>
        </button>
    );
}

export default RiderDashboard;
