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
    const [riderData, setRiderData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const [newOrderPopup, setNewOrderPopup] = useState<any>(null);
    const [timer, setTimer] = useState(15);
    const [activeOrder, setActiveOrder] = useState<any>(null);

    const fetchRiderData = async () => {
        try {
            const userStr = localStorage.getItem('userInfo');
            if (!userStr) return;
            const userInfo = JSON.parse(userStr);
            const token = userInfo.token;
            
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(`${API_BASE_URL}/api/riders/profile`, config);
            setRiderData(data);
            setIsOnline(data.isOnline || false);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching rider data:', err);
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
            if (!userStr) return;
            const userInfo = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            
            await axios.put(`${API_BASE_URL}/api/riders/status`, { isOnline: !isOnline }, config);
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

    const renderHome = () => (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Gradient Header */}
            <div className="relative bg-gradient-to-br from-orange-500 via-pink-500 to-pink-600 rounded-b-[40px] px-6 pt-12 pb-10 -mx-4 -mt-4 shadow-lg overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative flex justify-between items-start mb-8">
                    <div>
                        <p className="text-white/80 text-sm font-medium">Welcome back,</p>
                        <h1 className="text-white text-3xl font-bold tracking-tight">{riderData?.user?.name || 'Rider'}</h1>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-500 font-bold text-xl shadow-inner">
                        {riderData?.user?.name?.[0] || 'R'}
                    </div>
                </div>

                {/* Status Toggle Card */}
                <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 flex items-center justify-between shadow-xl">
                    <div>
                        <p className="text-white font-bold text-lg">You are {isOnline ? 'Online' : 'Offline'}</p>
                        <p className="text-white/70 text-sm">{isOnline ? 'Looking for new orders' : 'Go online to start earning'}</p>
                    </div>
                    <button 
                        onClick={handleToggleOnline}
                        className={`relative w-16 h-8 rounded-full transition-all duration-300 ${isOnline ? 'bg-green-400' : 'bg-gray-400/50'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${isOnline ? 'left-9' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-50 flex flex-col gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                        <FaWallet size={20} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Today's Earnings</p>
                        <p className="text-gray-900 text-xl font-bold">PKR {riderData?.earnings?.today || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-50 flex flex-col gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                        <FaBox size={20} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Deliveries</p>
                        <p className="text-gray-900 text-xl font-bold">{riderData?.totalDeliveries || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-50 flex flex-col gap-3">
                    <div className="w-10 h-10 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-500">
                        <FaStar size={20} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Rating</p>
                        <p className="text-gray-900 text-xl font-bold">{riderData?.rating || 'New'}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-50 flex flex-col gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
                        <FaClock size={20} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">This Week</p>
                        <p className="text-gray-900 text-xl font-bold">PKR {riderData?.earnings?.week || 0}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-gray-900 font-bold text-lg mb-4">Quick Actions</h3>
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-50 overflow-hidden">
                    <button className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition border-b border-gray-50">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                            <FaLocationArrow size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-gray-900 font-bold">Navigate to Order</p>
                            <p className="text-gray-400 text-xs">Get directions to pickup location</p>
                        </div>
                    </button>
                    <button className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition border-b border-gray-50" onClick={() => setActiveTab('earnings')}>
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                            <FaWallet size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-gray-900 font-bold">View Earnings</p>
                            <p className="text-gray-400 text-xs">Check your payment details</p>
                        </div>
                    </button>
                    <button className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                            <FaStar size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-gray-900 font-bold">Performance</p>
                            <p className="text-gray-400 text-xs">See your ratings & stats</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Recent Deliveries */}
            <div>
                <h3 className="text-gray-900 font-bold text-lg mb-4">Recent Deliveries</h3>
                <div className="flex flex-col gap-3">
                    {riderData?.recentOrders?.length > 0 ? (
                        riderData.recentOrders.map((order: any, idx: number) => (
                            <div key={idx} className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-50 flex justify-between items-center">
                                <div>
                                    <p className="text-gray-900 font-bold">{order.restaurantName}</p>
                                    <p className="text-gray-400 text-xs">#{order.orderId} • {order.timeAgo}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-500 font-bold">+PKR {order.earning}</p>
                                    <div className="flex items-center gap-1 justify-end">
                                        <FaStar className="text-yellow-400" size={10} />
                                        <p className="text-gray-400 text-xs">{order.rating}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-8 rounded-[32px] border border-dashed border-gray-200 text-center">
                            <p className="text-gray-400 text-sm">No recent deliveries</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderOrders = () => (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Gradient Header */}
             <div className="relative bg-gradient-to-br from-orange-500 via-pink-500 to-pink-600 rounded-b-[40px] px-6 pt-12 pb-10 -mx-4 -mt-4 shadow-lg overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-white text-3xl font-bold tracking-tight">Available Orders</h1>
                        <p className="text-white/80 text-sm font-medium">6 orders near you</p>
                    </div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                            <FaBell size={24} />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-pink-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">2</div>
                    </div>
                </div>

                {/* Potential Earnings Card */}
                <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 flex items-center justify-between shadow-xl">
                    <div>
                        <p className="text-white/70 text-sm font-medium">Potential Earnings</p>
                        <p className="text-white font-bold text-3xl">PKR 1590</p>
                    </div>
                    <div className="w-14 h-14 bg-green-400 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <FaWallet size={28} />
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold shadow-md whitespace-nowrap">
                    All Orders <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-lg">6</span>
                </button>
                <button className="px-6 py-3 bg-white text-gray-500 rounded-2xl font-bold border border-gray-100 whitespace-nowrap">
                    Nearby <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-lg text-gray-400">2</span>
                </button>
                <button className="px-6 py-3 bg-white text-gray-500 rounded-2xl font-bold border border-gray-100 whitespace-nowrap">
                    High Pay <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-lg text-gray-400">1</span>
                </button>
            </div>

            <RiderOrders />
        </div>
    );

    return (
        <div className="min-h-screen bg-white pb-28 px-4 pt-4 overflow-x-hidden no-scrollbar">
            <AnimatePresence mode="wait">
                {activeTab === 'home' && renderHome()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'active' && (
                    <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <FaBox size={48} className="mb-4 opacity-20" />
                            <p>No active orders</p>
                        </div>
                    </motion.div>
                )}
                {activeTab === 'earnings' && (
                    <motion.div key="earnings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <RiderEarnings />
                    </motion.div>
                )}
                {activeTab === 'profile' && (
                    <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <RiderProfile />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Order Request Popup */}
            <AnimatePresence>
                {newOrderPopup && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-black/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl"
                        >
                            <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-8 text-center relative">
                                <button className="absolute top-6 right-6 text-white/50 hover:text-white" onClick={() => setNewOrderPopup(null)}>
                                    <FaTimes size={20} />
                                </button>
                                <h2 className="text-white text-2xl font-bold mb-6 tracking-tight">New Order!</h2>
                                <div className="relative w-24 h-24 mx-auto mb-4">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="48" cy="48" r="44" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
                                        <circle 
                                            cx="48" cy="48" r="44" stroke="white" strokeWidth="4" fill="none"
                                            strokeDasharray={276}
                                            strokeDashoffset={276 - (276 * timer) / 15}
                                            className="transition-all duration-1000 ease-linear"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-3xl font-bold">{timer}s</div>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="space-y-6 mb-8">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 shrink-0">
                                            <FaMapMarkerAlt size={18} />
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Pickup from</p>
                                            <p className="text-gray-900 font-bold">{newOrderPopup.restaurantName}</p>
                                            <p className="text-gray-400 text-sm">{newOrderPopup.pickupAddress}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                                            <FaLocationArrow size={18} />
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Deliver to</p>
                                            <p className="text-gray-900 font-bold">Customer Address</p>
                                            <p className="text-gray-400 text-sm">{newOrderPopup.deliveryAddress}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-8">
                                    <div className="bg-gray-50 p-3 rounded-2xl text-center">
                                        <FaLocationArrow className="mx-auto mb-1 text-gray-400" size={14} />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Distance</p>
                                        <p className="text-gray-900 font-bold text-xs">{newOrderPopup.distance} km</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-2xl text-center">
                                        <FaWallet className="mx-auto mb-1 text-green-500" size={14} />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Earnings</p>
                                        <p className="text-green-500 font-bold text-xs">PKR {newOrderPopup.earning}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-2xl text-center">
                                        <FaClock className="mx-auto mb-1 text-gray-400" size={14} />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Estimate</p>
                                        <p className="text-gray-900 font-bold text-xs">{newOrderPopup.estimate} min</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition"
                                        onClick={() => setNewOrderPopup(null)}
                                    >
                                        Reject
                                    </button>
                                    <button 
                                        className="flex-[2] py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 hover:scale-[1.02] transition active:scale-[0.98]"
                                        onClick={() => {
                                            setActiveOrder(newOrderPopup);
                                            setNewOrderPopup(null);
                                        }}
                                    >
                                        Accept Order
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 pt-4 pb-8 flex justify-between items-center z-50">
                <button 
                    onClick={() => setActiveTab('home')}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'home' ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-200 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
                        <FaHome size={20} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider ${activeTab === 'home' ? 'text-orange-500' : 'text-gray-300'}`}>Home</span>
                </button>
                <button 
                    onClick={() => setActiveTab('orders')}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'orders' ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-200 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
                        <FaShoppingBag size={20} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider ${activeTab === 'orders' ? 'text-orange-500' : 'text-gray-300'}`}>Orders</span>
                </button>
                <button 
                    onClick={() => setActiveTab('active')}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'active' ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-200 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
                        <FaBox size={20} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider ${activeTab === 'active' ? 'text-orange-500' : 'text-gray-300'}`}>Active</span>
                </button>
                <button 
                    onClick={() => setActiveTab('earnings')}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'earnings' ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-200 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
                        <FaWallet size={20} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider ${activeTab === 'earnings' ? 'text-orange-500' : 'text-gray-300'}`}>Earnings</span>
                </button>
                <button 
                    onClick={() => setActiveTab('profile')}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'profile' ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-200 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
                        <FaUser size={20} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider ${activeTab === 'profile' ? 'text-orange-500' : 'text-gray-300'}`}>Profile</span>
                </button>
            </div>
        </div>
    );
};

export default RiderDashboard;
