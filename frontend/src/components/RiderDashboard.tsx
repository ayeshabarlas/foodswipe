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
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import { initSocket, getSocket, subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import RiderOrders from './RiderOrders';
import RiderEarnings from './RiderEarnings';
import RiderProfile from './RiderProfile';
import dynamic from 'next/dynamic';

const OrderTracking = dynamic(() => import('./OrderTracking'), { ssr: false });

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
    const [activeStep, setActiveStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any>(null);

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
            const currentActive = (ordersRes.data || []).find((o: any) => 
                ['Accepted', 'Preparing', 'Ready', 'Picked Up', 'OnTheWay', 'Arrived', 'ArrivedAtCustomer'].includes(o.status)
            );
            if (currentActive) {
                setActiveOrder(currentActive);
                // Determine step based on status
                if (['Accepted', 'Preparing', 'Ready', 'Arrived'].includes(currentActive.status)) setActiveStep(1);
                else if (currentActive.status === 'Picked Up') setActiveStep(2);
                else if (['OnTheWay', 'ArrivedAtCustomer'].includes(currentActive.status)) setActiveStep(3);
            }

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

    // Pusher and Geolocation Logic
    useEffect(() => {
        if (!riderData?.user?._id) return;

        const pusher = initSocket(riderData.user._id, 'rider', undefined, riderData._id);
        
        // initSocket already subscribes to 'rider-${riderData._id}' and 'riders'
        // We just need to get the socket wrapper to bind events
        const socket = getSocket();

        socket.on('orderStatusUpdate', (updatedOrder: any) => {
            console.log('Order status update received:', updatedOrder);
            setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
            
            // We'll update the active order in a separate check to avoid stale closures
        });

        socket.on('newOrderAvailable', (order: any) => {
            console.log('New order available for rider:', order);
            // Check online status from a ref or state that doesn't trigger re-effect
            setNewOrderPopup(order);
            setTimer(60);
            playNotificationSound();
        });

        return () => {
            // Only unsubscribe if the component is actually being destroyed
            // or if the rider ID changes
            unsubscribeFromChannel(`rider-${riderData._id}`);
            unsubscribeFromChannel('riders');
        };
    }, [riderData?.user?._id, riderData?._id]);

    // Separate effect for active order updates from socket
    useEffect(() => {
        if (!activeOrder) return;
        
        const socket = getSocket();
        const handleStatusUpdate = (updatedOrder: any) => {
            if (activeOrder?._id === updatedOrder._id) {
                setActiveOrder(updatedOrder);
                if (['Accepted', 'Preparing', 'Ready', 'Arrived'].includes(updatedOrder.status)) setActiveStep(1);
                else if (updatedOrder.status === 'Picked Up') setActiveStep(2);
                else if (['OnTheWay', 'ArrivedAtCustomer'].includes(updatedOrder.status)) setActiveStep(3);
            }
        };

        socket.on('orderStatusUpdate', handleStatusUpdate);
        return () => {
            socket.off('orderStatusUpdate', handleStatusUpdate);
        };
    }, [activeOrder?._id]);

    // Geolocation effect
    useEffect(() => {
        let watchId: number;

        if (isOnline && activeOrder) {
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        try {
                            await axios.post(`${API_BASE_URL}/api/orders/${activeOrder._id}/location`, {
                                location: { lat: latitude, lng: longitude }
                            });
                        } catch (err) {
                            console.error('Error updating location:', err);
                        }
                    },
                    (error) => console.error('Geolocation error:', error),
                    { enableHighAccuracy: true, distanceFilter: 10 }
                );
            }
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isOnline, activeOrder?._id]);

    const handleUpdateStatus = async (orderId: string, status: string, distanceKm?: number) => {
        try {
            const userStr = localStorage.getItem('userInfo');
            if (!userStr) return;
            const userInfo = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            let response;
            if (status === 'Delivered') {
                response = await axios.post(`${API_BASE_URL}/api/orders/${orderId}/complete`, { 
                    distanceKm: distanceKm || 5 
                }, config);
            } else {
                response = await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { 
                    status,
                    distanceKm 
                }, config);
            }
            
            const { data } = response;
            
            // Update local state
            setOrders(prev => prev.map(o => o._id === orderId ? data : o));
            
            if (['Accepted', 'Preparing', 'Ready', 'Picked Up', 'OnTheWay', 'Arrived', 'ArrivedAtCustomer'].includes(status)) {
                setActiveOrder(data);
                if (status === 'Picked Up') setActiveStep(2);
                else if (['OnTheWay', 'ArrivedAtCustomer'].includes(status)) setActiveStep(3);
                else setActiveStep(1);
            } else if (status === 'Delivered') {
                setActiveOrder(null);
                setActiveStep(1);
                toast.success('Order delivered successfully!');
                // Refresh data to show updated wallet balance
                fetchRiderData();
            }

            // Emit status update via socket
            const socket = getSocket();
            socket?.emit('updateOrderStatus', { orderId, status });
            
            // Also fetch fresh data to be sure
            fetchRiderData();

        } catch (err: any) {
            console.error('Failed to update order status:', err);
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleAcceptOrder = async (orderId: string) => {
        try {
            const userStr = localStorage.getItem('userInfo');
            if (!userStr || !riderData?._id) return;
            const userInfo = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const { data } = await axios.post(`${API_BASE_URL}/api/riders/${riderData._id}/accept-order`, { orderId }, config);
            
            toast.success('Order accepted successfully!');
            fetchRiderData(); // Refresh to show in active orders
            setNewOrderPopup(null);
            
            // Notify via socket
            const socket = getSocket();
            socket?.emit('updateOrderStatus', { orderId, status: data.order?.status || 'Ready' });
        } catch (err: any) {
            console.error('Failed to accept order:', err);
            toast.error(err.response?.data?.message || 'Failed to accept order');
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
                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200"
                >
                    Retry
                </button>
            </div>
        );
    }

    const renderHome = () => (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-light">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 pt-10 pb-24 px-6 rounded-b-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl" />
                
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-medium tracking-tight">Rider Dashboard</h1>
                        <p className="text-[10px] opacity-80 font-medium uppercase tracking-widest mt-0.5">Ready for your next delivery?</p>
                    </div>
                    <div className="relative">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                            <FaBell className="text-white text-lg" />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-orange-500 text-[8px] font-medium flex items-center justify-center">3</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-[28px] p-5 flex items-center justify-between border border-white/20">
                    <div>
                        <p className="text-white text-sm font-light tracking-tight">You are {isOnline ? 'Online' : 'Offline'}</p>
                        <p className="text-white/70 text-[9px] font-extralight">{isOnline ? 'Looking for new orders' : 'Go online to start earning'}</p>
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
                    value={`Rs. ${riderData?.earnings?.today || 180}`} 
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
                    value={`Rs. ${riderData?.earnings?.thisWeek || 0}`} 
                    color="text-purple-500" 
                    bgColor="bg-purple-50" 
                />
            </div>

            {/* Active Order Stepper - Only show if there's an active order */}
            {activeOrder && (
                <div className="mt-4 px-2">
                    <div className="bg-white rounded-[40px] p-6 shadow-xl shadow-orange-500/5 border border-orange-500/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-gray-900 font-medium text-base">Active Delivery</h3>
                            <div className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-[9px] font-medium uppercase tracking-widest">
                                Step {activeStep}/3
                            </div>
                        </div>

                        {/* Stepper UI */}
                        <div className="relative flex justify-between mb-8 px-4">
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
                            <div 
                                className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 -translate-y-1/2 z-0 transition-all duration-500" 
                                style={{ width: `${((activeStep - 1) / 2) * 100}%` }}
                            />
                            
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="relative z-10">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                        activeStep >= step ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-300 border-2 border-gray-100'
                                    }`}>
                                        {activeStep > step ? <FaCheckCircle size={18} /> : (
                                            step === 1 ? <FaHome size={16} /> :
                                            step === 2 ? <FaBox size={16} /> :
                                            <FaMapMarkerAlt size={16} />
                                        )}
                                    </div>
                                    <p className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-medium uppercase tracking-widest ${
                                        activeStep >= step ? 'text-orange-500' : 'text-gray-300'
                                    }`}>
                                        {step === 1 ? 'Restaurant' : step === 2 ? 'Picked Up' : 'Customer'}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Order Info */}
                        <div className="bg-gray-50 rounded-3xl p-4 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-gray-900 font-medium">{activeOrder.restaurant?.name}</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-1">{activeStep === 1 ? activeOrder.restaurant?.address : activeOrder.shippingAddress?.address}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-orange-500 font-medium">Rs. 180</p>
                                    <p className="text-gray-400 text-[10px] uppercase">Earning</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button 
                            onClick={() => {
                                console.log('Updating status from:', activeOrder.status);
                                if (activeOrder.status === 'Ready' || activeOrder.status === 'Confirmed' || activeOrder.status === 'Accepted' || activeOrder.status === 'Preparing') {
                                    handleUpdateStatus(activeOrder._id, 'Arrived', activeOrder.distance);
                                } else if (activeOrder.status === 'Arrived') {
                                    handleUpdateStatus(activeOrder._id, 'Picked Up', activeOrder.distance);
                                } else if (activeOrder.status === 'Picked Up') {
                                    handleUpdateStatus(activeOrder._id, 'OnTheWay', activeOrder.distance);
                                } else if (activeOrder.status === 'OnTheWay') {
                                    handleUpdateStatus(activeOrder._id, 'ArrivedAtCustomer', activeOrder.distance);
                                } else if (activeOrder.status === 'ArrivedAtCustomer') {
                                    handleUpdateStatus(activeOrder._id, 'Delivered', activeOrder.distance);
                                }
                            }}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl text-[10px] font-medium uppercase tracking-widest shadow-lg shadow-orange-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            { (activeOrder.status === 'Ready' || activeOrder.status === 'Confirmed' || activeOrder.status === 'Accepted' || activeOrder.status === 'Preparing') ? 'Arrived at Restaurant' : 
                              activeOrder.status === 'Arrived' ? 'Pick Up Order' :
                              activeOrder.status === 'Picked Up' ? 'Start Delivery' :
                              activeOrder.status === 'OnTheWay' ? 'Arrived at Customer' :
                              activeOrder.status === 'ArrivedAtCustomer' ? 'Order Completed' : 'Update Status'}
                        </button>
                    </div>
                </div>
            )}

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
        const availableOrders = orders.filter(o => !o.rider && (o.status === 'Ready' || o.status === 'OnTheWay'));
        const activeOrders = orders.filter(o => o.rider && ['Ready', 'OnTheWay', 'Picked Up'].includes(o.status));

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
                            Available ({availableOrders.length})
                        </button>
                        <button 
                            onClick={() => setOrderFilter('active')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${orderFilter === 'active' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}
                        >
                            Active ({activeOrders.length})
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
                                        <p className="text-gray-400 text-[10px] font-light uppercase tracking-widest mt-1">
                                            #{order._id.slice(-6)} • {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                        </p>
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
                                {order.rider && (
                                    <button 
                                        onClick={() => {
                                            setSelectedOrderForTracking(order);
                                            setShowTrackingModal(true);
                                        }} 
                                        className="flex-1 bg-blue-50 text-blue-500 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all"
                                    >
                                        Track
                                    </button>
                                )}
                                {order.rider ? (
                                    <button 
                                        onClick={() => handleUpdateStatus(order._id, order.status === 'Picked Up' ? 'Delivered' : 'Picked Up', order.distance || order.distanceKm)}
                                        className="flex-[2] bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        {order.status === 'Picked Up' ? 'Mark Delivered' : 'Confirm Pick Up'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleAcceptOrder(order._id)}
                                        className="flex-[2] bg-green-500 text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Accept Order
                                    </button>
                                )}
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
                {activeTab === 'orders' && <RiderOrders riderId={riderData?._id} />}
                {activeTab === 'earnings' && <RiderEarnings riderId={riderData?._id} />}
                {activeTab === 'profile' && <RiderProfile riderId={riderData?._id} />}
            </div>

            <AnimatePresence>
                {newOrderPopup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">New Order!</h2>
                                    <p className="text-orange-500 font-medium">#{newOrderPopup._id.slice(-6)}</p>
                                </div>
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                                    <FaBell className="animate-bounce" />
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                        <FaShoppingBag size={14} />
                                    </div>
                                    <p className="text-gray-600 text-sm">{newOrderPopup.restaurant?.name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                        <FaMapMarkerAlt size={14} />
                                    </div>
                                    <p className="text-gray-600 text-sm">{newOrderPopup.shippingAddress?.address}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="bg-gray-50 p-3 rounded-2xl text-center">
                                        <p className="text-[10px] text-gray-400 uppercase">Earnings</p>
                                        <p className="font-bold text-gray-900">Rs. 180</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-2xl text-center">
                                        <p className="text-[10px] text-gray-400 uppercase">Time Left</p>
                                        <p className="font-bold text-orange-500">{timer}s</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setNewOrderPopup(null)}
                                    className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                                >
                                    Decline
                                </button>
                                <button 
                                    onClick={() => handleAcceptOrder(newOrderPopup._id)}
                                    className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-xs uppercase tracking-widest hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-100 transition-all active:scale-95"
                                >
                                    Accept
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

            {selectedOrderForTracking && (
                <OrderTracking 
                    isOpen={showTrackingModal}
                    onClose={() => {
                        setShowTrackingModal(false);
                        setSelectedOrderForTracking(null);
                    }}
                    order={selectedOrderForTracking}
                    userRole="rider"
                />
            )}
        </div>
    );
}

function NavButton({ active, onClick, icon, label }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 rounded-[28px] ${
                active 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 shadow-lg shadow-orange-200' 
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
