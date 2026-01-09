'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck, FaClock, FaMapMarkerAlt, FaCommentDots, FaBan, FaMotorcycle, FaShoppingBag, FaPaperPlane } from 'react-icons/fa';
import CancelOrderModal from './CancelOrderModal';
import { initSocket, getSocket, disconnectSocket } from '../utils/socket';
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import OrderChat from './OrderChat';

// Dynamically import map to avoid SSR issues
const OrderTracking = dynamic(() => import('./OrderTracking'), { ssr: false });

interface Order {
    _id: string;
    user: { _id: string; name: string; phone: string; email: string };
    orderItems: { name: string; qty: number; price: number; product: string }[];
    totalPrice: number;
    status: 'Pending' | 'Accepted' | 'Preparing' | 'Ready' | 'OnTheWay' | 'Delivered' | 'Cancelled' | 'Picked Up';
    createdAt: string;
    shippingAddress: { address: string };
    paymentMethod: string;
    cancellationReason?: string;
    prepTime?: number;
    delayedUntil?: string;
    delayReason?: string;
    rider?: any;
}

interface Message {
    id: string;
    text: string;
    sender: 'restaurant' | 'rider' | 'customer';
    timestamp: string;
    senderName: string;
}

interface OrderBoardProps {
    restaurant: any;
    onUpdate?: () => void;
}

export default function OrderBoard({ restaurant, onUpdate }: OrderBoardProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [newOrderPopup, setNewOrderPopup] = useState<Order | null>(null);
    const [countdown, setCountdown] = useState(60);
    const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
    const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
    const [activeChat, setActiveChat] = useState<Order | null>(null);
    const [prepTimes, setPrepTimes] = useState<Record<string, number>>({});
    
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchOrders = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get(`${API_BASE_URL}/api/orders/restaurant/my-orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Ensure we always set an array
            if (Array.isArray(res.data)) {
                setOrders(res.data);
                setLastUpdated(new Date());
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            // Don't clear orders on error, just stop loading
            setLoading(false);
        }
    };

    useEffect(() => {
        if (restaurant?._id) {
            fetchOrders();
        }
    }, [restaurant?._id]);

    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const resId = restaurant?._id || userInfo.restaurantId;
        
        if (!resId) return;

        const socket = initSocket(userInfo._id, 'restaurant', resId);

        socket?.on('newOrder', (order: Order) => {
            console.log('OrderBoard: New order received via socket:', order);
            setOrders(prev => {
                const exists = prev.find(o => o._id === order._id);
                if (exists) return prev;
                return [order, ...prev];
            });
            setNewOrderPopup(order);
            setCountdown(30);
            playNotificationSound();
        });

        socket?.on('orderStatusUpdate', (updatedOrder: any) => {
            console.log('OrderBoard: Order status update via socket:', updatedOrder);
            const orderId = updatedOrder._id || updatedOrder.orderId;
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...updatedOrder } : o));
            // Instead of full fetch, we update locally, but fetch after a delay to ensure DB consistency
            setTimeout(fetchOrders, 1000);
          });

          socket?.on('riderAccepted', (data: any) => {
            console.log('OrderBoard: Rider accepted order via socket:', data);
            toast.success(`Rider ${data.riderName} accepted order #${data.orderId.slice(-4)}`);
            fetchOrders();
          });

          socket?.on('riderPickedUp', (data: any) => {
            console.log('OrderBoard: Rider picked up order via socket:', data);
            fetchOrders();
        });

        return () => {
            // We don't necessarily want to disconnect here if the component re-renders
            // socket.off('newOrder'); etc. could be used instead
        };
    }, [restaurant?._id]);

    useEffect(() => {
        if (newOrderPopup && countdown > 0) {
            const timer = setInterval(() => setCountdown(c => c - 1), 1000);
            return () => clearInterval(timer);
        } else if (countdown === 0 && newOrderPopup) {
            setNewOrderPopup(null);
        }
    }, [newOrderPopup, countdown]);

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const updateStatus = async (orderId: string, status: string, extraData = {}) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(
                `${API_BASE_URL}/api/orders/${orderId}/status`,
                { status, ...extraData },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Order marked as ${status}`);
            
            // Refresh local orders
            await fetchOrders();
            
            // Notify parent dashboard to refresh stats
            if (onUpdate) {
                onUpdate();
            }
            
            setRejectingOrder(null);
            setCancellationReason('');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const handleAcceptOrder = (orderId: string) => {
        updateStatus(orderId, 'Accepted');
        setNewOrderPopup(null);
    };

    const getInitials = (name: string) => {
        return name
            ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : '??';
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-orange-100 text-orange-700';
            case 'Accepted': return 'bg-blue-100 text-blue-700';
            case 'Preparing': return 'bg-indigo-100 text-indigo-700';
            case 'Ready': return 'bg-green-100 text-green-700';
            case 'OnTheWay': return 'bg-purple-100 text-purple-700';
            case 'Picked Up': return 'bg-purple-100 text-purple-700';
            case 'Delivered': return 'bg-gray-100 text-gray-700';
            case 'Cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    // Filter orders by status - ensure orders is an array
    const ordersArray = Array.isArray(orders) ? orders : [];
    
    // Debug logging to track order status changes
    console.log('Total orders:', ordersArray.length);
    console.log('Orders statuses:', ordersArray.map(o => ({ id: o._id.slice(-4), status: o.status })));

    const pendingOrders = ordersArray.filter(o => o.status === 'Pending');
    const preparingOrders = ordersArray.filter(o => ['Accepted', 'Preparing'].includes(o.status));
    const readyOrders = ordersArray.filter(o => o.status === 'Ready');
    const completedOrders = ordersArray.filter(o => ['OnTheWay', 'Picked Up', 'Delivered'].includes(o.status));

    console.log('Filtered counts:', {
        pending: pendingOrders.length,
        preparing: preparingOrders.length,
        ready: readyOrders.length,
        completed: completedOrders.length
    });

    const renderOrderCard = (order: Order) => {
        if (!order || !order._id) return null;

        const initials = order.user?.name
            ? order.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            : '??';

        const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];

        const canTrack = ['OnTheWay', 'Picked Up'].includes(order.status);
        const statusLower = (order.status || '').toLowerCase().replace(/\s/g, '');

        return (
            <motion.div
                key={order._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group"
            >
                {/* Order Header - Match Screenshot 2/3 */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-[#FF7E47]/10 flex items-center justify-center text-[#FF7E47] font-medium text-sm">
                            {initials}
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 text-[13px]">{order.user?.name || 'Guest'}</h4>
                            <p className="text-[10px] text-gray-400 font-light mt-0.5 tracking-tight">Order #{order._id.slice(-4)}</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-medium uppercase tracking-widest ${getStatusBadgeColor(order.status)}`}>
                        {order.status}
                    </div>
                </div>

                {/* Items Summary - Bullet points as Screenshot 2 */}
                <div className="bg-[#F8FAFC]/50 rounded-2xl p-4 mb-5 border border-gray-50">
                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mb-2.5">Items:</p>
                    <ul className="space-y-1.5">
                        {order.orderItems.map((item, idx) => (
                            <li key={idx} className="flex items-center text-xs text-gray-600 font-light">
                                <span className="w-1 h-1 rounded-full bg-gray-300 mr-2 shrink-0"></span>
                                <span className="truncate">{item.name}</span>
                                {item.qty > 1 && <span className="ml-1.5 text-gray-400 text-[10px] font-medium">x{item.qty}</span>}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Total & Address */}
                <div className="flex justify-between items-center mb-5 px-1">
                    <span className="text-gray-400 text-[11px] font-light">Total Amount</span>
                    <span className="text-gray-900 text-base font-medium">Rs. {order.totalPrice.toFixed(0)}</span>
                </div>

                <div className="flex items-start gap-2 mb-6 px-1 text-gray-400">
                    <FaMapMarkerAlt className="mt-0.5 shrink-0 opacity-40" size={11} />
                    <span className="text-[10px] font-light leading-relaxed line-clamp-2">{order.shippingAddress?.address}</span>
                </div>

                {/* Rider Info - Screenshot 3 */}
                {order.rider && (
                    <div className="bg-[#EFF6FF]/50 rounded-2xl p-4 mb-6 border border-blue-50/50">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-medium text-[10px]">
                                    {getInitials(order.rider.fullName || order.rider.user?.name || 'Rider')}
                                </div>
                                <div>
                                    <h5 className="text-[11px] font-medium text-gray-900">{order.rider.fullName || order.rider.user?.name || 'Delivery Partner'}</h5>
                                    <p className="text-[9px] text-blue-500 font-light">Delivery Partner</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-blue-500 font-medium uppercase tracking-tighter">ETA: 5 mins</p>
                            </div>
                        </div>
                        {/* Progress Stepper - Match Screenshot 3 */}
                        <div className="relative pt-1 pb-5 px-2">
                            <div className="absolute top-2 left-2 right-2 h-[1px] bg-gray-100"></div>
                            <div className="absolute top-2 left-2 w-1/4 h-[1px] bg-blue-400"></div>
                            <div className="flex justify-between relative">
                                {['Assigned', 'On Way', 'Arrived', 'Picked Up'].map((step, i) => (
                                    <div key={step} className="flex flex-col items-center">
                                        <div className={`w-2 h-2 rounded-full z-10 border-2 border-white ${i === 0 ? 'bg-blue-400' : 'bg-gray-200'}`}></div>
                                        <span className="text-[7px] font-medium text-gray-400 absolute -bottom-4 mt-1 whitespace-nowrap tracking-tight">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Preparation Time Selection - Screenshot 3 */}
                {order.status === 'Accepted' && (
                    <div className="bg-[#FFF7ED] rounded-2xl p-4 mb-6 border border-orange-100">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-3">Preparation Time</p>
                        <div className="flex gap-2">
                            <select
                                className="flex-1 bg-white border border-orange-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-700 focus:ring-orange-500 focus:border-orange-500"
                                value={prepTimes[order._id] || 20}
                                onChange={(e) => setPrepTimes({ ...prepTimes, [order._id]: parseInt(e.target.value) })}
                            >
                                {[15, 20, 30, 45, 60].map(m => (
                                    <option key={m} value={m}>{m} minutes</option>
                                ))}
                            </select>
                            <button className="bg-orange-50 text-orange-600 w-10 h-10 rounded-xl font-bold hover:bg-orange-100 transition text-sm">+5</button>
                            <button className="bg-orange-50 text-orange-600 w-10 h-10 rounded-xl font-bold hover:bg-orange-100 transition text-sm">+10</button>
                        </div>
                    </div>
                )}

                {/* Actions - Refined based on Screenshot 2/3 */}
                <div className="flex flex-col gap-2.5">
                    {order.status === 'Pending' && (
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => handleAcceptOrder(order._id)}
                                className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white py-3 rounded-2xl font-medium text-[11px] transition shadow-sm"
                            >
                                ACCEPT
                            </button>
                            <button
                                onClick={() => setRejectingOrder(order._id)}
                                className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white py-3 rounded-2xl font-medium text-[11px] transition shadow-sm"
                            >
                                REJECT
                            </button>
                            <button
                                onClick={() => setActiveChat(order)}
                                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition border border-gray-100/50 shadow-sm"
                            >
                                <FaCommentDots size={16} />
                            </button>
                            <button
                                onClick={() => setCancellingOrderId(order._id)}
                                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-red-50/50 text-red-400 hover:bg-red-50 transition border border-red-100/30"
                            >
                                <FaBan size={14} />
                            </button>
                        </div>
                    )}

                    {order.status === 'Accepted' && (
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => updateStatus(order._id, 'Preparing', { prepTime: prepTimes[order._id] || 20 })}
                                className="flex-1 bg-blue-500 text-white py-3 rounded-2xl font-medium text-[11px] hover:bg-blue-600 transition shadow-sm"
                            >
                                START PREPARING
                            </button>
                            <button
                                onClick={() => setActiveChat(order)}
                                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition border border-gray-100/50 shadow-sm"
                            >
                                <FaCommentDots size={16} />
                            </button>
                        </div>
                    )}

                    {order.status === 'Preparing' && (
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => updateStatus(order._id, 'Ready')}
                                className="flex-1 bg-[#22C55E] text-white py-3 rounded-2xl font-medium text-[11px] hover:bg-[#16A34A] transition shadow-sm"
                            >
                                MARK READY
                            </button>
                            <button
                                className="flex-1 bg-[#F59E0B] text-white py-3 rounded-2xl font-medium text-[11px] hover:bg-[#D97706] transition shadow-sm"
                            >
                                DELAY
                            </button>
                            <button
                                onClick={() => setActiveChat(order)}
                                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition border border-gray-100/50 shadow-sm"
                            >
                                <FaCommentDots size={16} />
                            </button>
                        </div>
                    )}

                    {order.status === 'Ready' && (
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => updateStatus(order._id, 'OnTheWay')}
                                className="flex-1 bg-purple-500 text-white py-3 rounded-2xl font-medium text-[11px] hover:bg-purple-600 transition shadow-sm"
                            >
                                HAND TO RIDER
                            </button>
                            <button
                                onClick={() => setActiveChat(order)}
                                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition border border-gray-100/50 shadow-sm"
                            >
                                <FaCommentDots size={16} />
                            </button>
                        </div>
                    )}

                    {(order.status === 'OnTheWay' || order.status === 'Picked Up' || order.status === 'Delivered') && (
                        <div className="flex gap-2.5">
                            {canTrack && (
                                <button
                                    onClick={() => setTrackingOrder(order)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-50/50 text-blue-500 font-medium text-[11px] hover:bg-blue-50 transition border border-blue-100/30"
                                >
                                    <FaMotorcycle size={14} />
                                    TRACK RIDER
                                </button>
                            )}
                            <button
                                onClick={() => setActiveChat(order)}
                                className={`${canTrack ? 'w-11' : 'flex-1'} h-11 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition border border-gray-100/50 shadow-sm`}
                            >
                                <FaCommentDots size={16} />
                                {!canTrack && <span className="ml-2 text-[11px]">CHAT WITH CUSTOMER</span>}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    if (loading) {
        return <div className="text-center py-10">Loading orders...</div>;
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
            {/* Header Section */}
            <div className="px-6 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Order Management</h2>
                    <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => fetchOrders()}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        REFRESH
                    </button>
                    
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button className="px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm">ACTIVE</button>
                        <button className="px-4 py-1.5 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700">HISTORY</button>
                    </div>
                </div>
            </div>

            {/* Top Status Cards - New as per Screenshot 2 */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                {/* Pending Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center">
                                <FaClock className="text-orange-500 text-lg" />
                            </div>
                            <span className="text-[9px] font-medium text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full">New</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-3xl font-medium text-gray-900 mb-0.5">{pendingOrders.length}</h2>
                                <p className="text-[11px] font-light text-gray-400">Pending Orders</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preparing Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                                <FaShoppingBag className="text-blue-500 text-lg" />
                            </div>
                            <span className="text-[9px] font-medium text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">Preparing</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-3xl font-medium text-gray-900 mb-0.5">{preparingOrders.length}</h2>
                                <p className="text-[11px] font-light text-gray-400">In Kitchen</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ready Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center">
                                <FaCheck className="text-green-500 text-lg" />
                            </div>
                            <span className="text-[9px] font-medium text-green-500 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full">Ready</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-3xl font-medium text-gray-900 mb-0.5">{readyOrders.length}</h2>
                                <p className="text-[11px] font-light text-gray-400">For Pickup</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Out for Delivery Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
                                <FaPaperPlane className="text-purple-500 text-lg" />
                            </div>
                            <span className="text-[9px] font-medium text-purple-500 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded-full">Out</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-3xl font-medium text-gray-900 mb-0.5">{completedOrders.length}</h2>
                                <p className="text-[11px] font-light text-gray-400">Out for Delivery</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tracking Modal */}
            <AnimatePresence>
                {trackingOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setTrackingOrder(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Live Tracking</h2>
                                <button
                                    onClick={() => setTrackingOrder(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <OrderTracking order={trackingOrder} userRole="restaurant" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Order Popup remains same as it's a modal */}
            <AnimatePresence>
                {newOrderPopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setNewOrderPopup(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl overflow-hidden relative"
                        >
                            {/* Header - Screenshot 1 */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-[#FF4D00] rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                                        <FaClock className="text-white text-2xl" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[#FF4D00]">New Order Arrived!</h2>
                                        <p className="text-sm text-gray-400 font-bold tracking-tight">Order #{newOrderPopup._id.slice(-4)}</p>
                                    </div>
                                </div>
                                <div className="w-16 h-16 relative flex items-center justify-center">
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
                                            strokeDashoffset={175.9 * (1 - countdown / 60)}
                                            className="text-[#FF4D00] transition-all duration-1000"
                                        />
                                    </svg>
                                    <span className="absolute text-[#FF4D00] font-black text-lg">{countdown}s</span>
                                </div>
                            </div>

                            {/* Customer - Screenshot 1 */}
                            <div className="bg-[#F8FAFC] rounded-3xl p-5 mb-6 flex items-center gap-4 border border-gray-50">
                                <div className="w-14 h-14 bg-[#3B82F6] rounded-full flex items-center justify-center text-white font-black text-lg shadow-md">
                                    {getInitials(newOrderPopup.user?.name || 'Guest')}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg">{newOrderPopup.user?.name}</h3>
                                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Regular Customer</p>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="flex items-start gap-3 mb-8 px-2 text-gray-500">
                                <FaMapMarkerAlt className="mt-1 shrink-0 text-gray-400" size={18} />
                                <span className="text-sm font-bold leading-relaxed">{newOrderPopup.shippingAddress?.address}</span>
                            </div>

                            {/* Items List - Match Screenshot 1 */}
                            <div className="mb-8">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Order Items</p>
                                <div className="space-y-3">
                                    {newOrderPopup.orderItems.map((item, idx) => (
                                        <div key={idx} className="bg-[#F8FAFC] rounded-2xl p-4 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                                            <div>
                                                <span className="block font-black text-gray-900 text-sm">{item.name}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Default Options</span>
                                            </div>
                                            <span className="font-black text-gray-900 text-sm">Rs. {item.price.toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t-2 border-dashed border-gray-100 pt-6 mt-6 px-2 flex justify-between items-end">
                                    <span className="text-gray-400 font-black text-sm uppercase tracking-widest">Total</span>
                                    <span className="text-[#FF4D00] text-3xl font-black">Rs. {newOrderPopup.totalPrice.toFixed(0)}</span>
                                </div>
                            </div>

                            {/* Actions - Gradient Buttons as Screenshot 1 */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setRejectingOrder(newOrderPopup._id);
                                        setNewOrderPopup(null);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-[#FF416C] to-[#FF4B2B] hover:shadow-xl hover:shadow-red-500/30 text-white px-6 py-4.5 rounded-[24px] font-black text-sm transition-all active:scale-95"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleAcceptOrder(newOrderPopup._id)}
                                    className="flex-1 bg-gradient-to-r from-[#00b09b] to-[#96c93d] hover:shadow-xl hover:shadow-green-500/30 text-white px-6 py-4.5 rounded-[24px] font-black text-sm transition-all active:scale-95"
                                >
                                    Accept Order
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectingOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                        onClick={() => setRejectingOrder(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 max-w-md w-full"
                        >
                            <h3 className="text-xl font-bold mb-4">Reject Order</h3>
                            <p className="text-gray-600 mb-4">Please select a reason:</p>
                            <div className="space-y-2 mb-6">
                                {['Out of Stock', 'Kitchen Overload', 'Staff Unavailable', 'Closing Soon', 'Other'].map(reason => (
                                    <button
                                        key={reason}
                                        onClick={() => setCancellationReason(reason)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border transition ${cancellationReason === reason
                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRejectingOrder(null)}
                                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => updateStatus(rejectingOrder, 'Cancelled', { cancellationReason })}
                                    disabled={!cancellationReason}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold disabled:opacity-50"
                                >
                                    Reject Order
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Order Grid - Fixed Scrollability */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden h-full pb-4">
                {/* Pending Column */}
                <div className="flex flex-col h-full bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                            New Orders
                        </span>
                        <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg font-black">
                            {pendingOrders.length}
                        </span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {pendingOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale py-10">
                                <FaShoppingBag size={24} className="mb-2 text-gray-400" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Empty</p>
                            </div>
                        ) : (
                            pendingOrders.map(renderOrderCard)
                        )}
                    </div>
                </div>

                {/* Preparing Column */}
                <div className="flex flex-col h-full bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></div>
                            Preparing
                        </span>
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg font-black">
                            {preparingOrders.length}
                        </span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {preparingOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale py-10">
                                <FaClock size={24} className="mb-2 text-gray-400" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Empty</p>
                            </div>
                        ) : (
                            preparingOrders.map(renderOrderCard)
                        )}
                    </div>
                </div>

                {/* Ready Column */}
                <div className="flex flex-col h-full bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            Ready
                        </span>
                        <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-lg font-black">
                            {readyOrders.length}
                        </span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {readyOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale py-10">
                                <FaCheck size={24} className="mb-2 text-gray-400" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Empty</p>
                            </div>
                        ) : (
                            readyOrders.map(renderOrderCard)
                        )}
                    </div>
                </div>

                {/* Completed Column */}
                <div className="flex flex-col h-full bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                            Active
                        </span>
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-lg font-black">
                            {completedOrders.length}
                        </span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {completedOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale py-10">
                                <FaMotorcycle size={24} className="mb-2 text-gray-400" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Empty</p>
                            </div>
                        ) : (
                            completedOrders.map(renderOrderCard)
                        )}
                    </div>
                </div>
            </div>

            {/* Order Chat */}
            {activeChat && (
                <OrderChat
                    orderId={activeChat._id}
                    isOpen={!!activeChat}
                    onClose={() => setActiveChat(null)}
                    userRole="restaurant"
                    userName={restaurant?.name || 'Restaurant'}
                    userId={userInfo._id}
                    orderStatus={activeChat.status}
                />
            )}

            {/* Cancel Order Modal */}
            <CancelOrderModal
                isOpen={!!cancellingOrderId}
                onClose={() => setCancellingOrderId(null)}
                orderId={cancellingOrderId || ''}
                onCancelSuccess={() => {
                    fetchOrders();
                    setCancellingOrderId(null);
                }}
            />

            {/* Toast notifications */}
            <Toaster />
        </div>
    );
}
