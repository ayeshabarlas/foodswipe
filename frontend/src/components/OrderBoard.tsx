'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck, FaClock, FaMapMarkerAlt, FaCommentDots, FaBan, FaMotorcycle } from 'react-icons/fa';
import CancelOrderModal from './CancelOrderModal';
import { initSocket, getSocket, disconnectSocket } from '../utils/socket';
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

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

export default function OrderBoard({ restaurant }: OrderBoardProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [newOrderPopup, setNewOrderPopup] = useState<Order | null>(null);
    const [countdown, setCountdown] = useState(60);
    const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
    const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
    const [activeChat, setActiveChat] = useState<Order | null>(null);
    const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({});
    const [currentMessage, setCurrentMessage] = useState('');
    const [prepTimes, setPrepTimes] = useState<Record<string, number>>({});

    const fetchOrders = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get(`${API_BASE_URL}/api/orders/restaurant/my-orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Ensure we always set an array
            setOrders(Array.isArray(res.data) ? res.data : []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]); // Set empty array on error
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const resId = restaurant?._id || userInfo.restaurantId;
        const socket = initSocket(userInfo._id, 'restaurant', resId);

        socket?.on('newOrder', (order: Order) => {
            setOrders(prev => [order, ...prev]);
            setNewOrderPopup(order);
            setCountdown(60);
            playNotificationSound();
        });

        socket?.on('orderStatusUpdate', (updatedOrder: any) => {
            setOrders(prev => prev.map(o => o._id === updatedOrder.orderId ? { ...o, status: updatedOrder.status } : o));
            fetchOrders(); // Refresh to get full details
        });

        socket?.on('riderPickedUp', () => {
            fetchOrders();
        });

        socket?.on('orderMessage', (data: { orderId: string; message: Message }) => {
            setChatMessages(prev => ({
                ...prev,
                [data.orderId]: [...(prev[data.orderId] || []), data.message]
            }));
            if (!activeChat || activeChat._id !== data.orderId) {
                toast.success(`New message from ${data.message.senderName}`, {
                    icon: '💬',
                    position: 'bottom-right'
                });
            }
        });

        return () => {
            disconnectSocket();
        };
    }, []);

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
            fetchOrders();
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

    useEffect(() => {
        if (activeChat) {
            const socket = getSocket();
            socket?.emit('joinOrderChat', { orderId: activeChat._id });
        }
    }, [activeChat]);

    const handleSendMessage = () => {
        if (!currentMessage.trim() || !activeChat) return;

        const socket = getSocket();
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

        const messageData: Message = {
            id: Date.now().toString(),
            text: currentMessage,
            sender: 'restaurant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            senderName: restaurant?.name || userInfo.name || 'Restaurant'
        };

        socket?.emit('sendOrderMessage', {
            orderId: activeChat._id,
            message: messageData,
            recipients: ['customer', 'rider']
        });

        setChatMessages(prev => ({
            ...prev,
            [activeChat._id]: [...(prev[activeChat._id] || []), messageData]
        }));
        setCurrentMessage('');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
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
    const pendingOrders = ordersArray.filter(o => o.status === 'Pending');
    const preparingOrders = ordersArray.filter(o => ['Accepted', 'Preparing'].includes(o.status));
    const readyOrders = ordersArray.filter(o => o.status === 'Ready');
    const completedOrders = ordersArray.filter(o => ['OnTheWay', 'Picked Up', 'Delivered'].includes(o.status));

    const renderOrderCard = (order: Order) => {
        const initials = getInitials(order.user?.name || 'Guest');
        const canTrack = ['OnTheWay', 'Picked Up'].includes(order.status);
        const hasRider = !!order.rider;

        return (
            <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
            >
                {/* Header: Customer & Status */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{order.user?.name || 'Guest'}</h3>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">#{order._id.slice(-6)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${getStatusBadgeColor(order.status)}`}>
                        {order.status}
                    </span>
                </div>

                {/* Items Summary */}
                <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-50">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase">Items</span>
                        <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                            {order.orderItems.length} {order.orderItems.length === 1 ? 'Item' : 'Items'}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {order.orderItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[13px] text-gray-700">
                                <span className="truncate font-medium flex-1">{item.name}</span>
                                <span className="font-bold text-gray-900 ml-2">x{item.qty}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Bar: Time & Price */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-1.5">
                        <FaClock className="text-gray-400" size={12} />
                        <span className="text-xs font-semibold text-gray-600">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Total</span>
                        <span className="text-base font-black text-gray-900">Rs. {order.totalPrice.toFixed(0)}</span>
                    </div>
                </div>

                {/* Preparation Time Adjustment (Only for Accepted/Preparing) */}
                {(order.status === 'Accepted' || order.status === 'Preparing') && (
                    <div className="mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Prep Time (mins)</p>
                        <div className="flex gap-2">
                            {[15, 25, 35, 45].map(time => (
                                <button
                                    key={time}
                                    onClick={() => setPrepTimes(prev => ({ ...prev, [order._id]: time }))}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${prepTimes[order._id] === time
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                                        }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        {order.status === 'Pending' && (
                            <>
                                <button
                                    onClick={() => handleAcceptOrder(order._id)}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow-md"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => setRejectingOrder(order._id)}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow-md"
                                >
                                    Reject
                                </button>
                            </>
                        )}
                        {order.status === 'Accepted' && (
                            <button
                                onClick={() => updateStatus(order._id, 'Preparing', { prepTime: prepTimes[order._id] || 25 })}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow-md"
                            >
                                Start Preparing
                            </button>
                        )}
                        {order.status === 'Preparing' && (
                            <button
                                onClick={() => updateStatus(order._id, 'Ready')}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow-md"
                            >
                                Mark Ready
                            </button>
                        )}
                        {order.status === 'Ready' && (
                            <button
                                onClick={() => updateStatus(order._id, 'OnTheWay')}
                                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow-md"
                            >
                                Hand to Rider
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {/* Chat Button */}
                        <button
                            onClick={() => setActiveChat(order)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-gray-200"
                        >
                            <FaCommentDots size={14} /> Chat
                        </button>

                        {/* Track Button */}
                        {canTrack && (
                            <button
                                onClick={() => setTrackingOrder(order)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <FaMotorcycle size={14} /> Track
                            </button>
                        )}

                        {/* Cancel Button */}
                        {!['Delivered', 'Cancelled'].includes(order.status) && !canTrack && (
                            <button
                                onClick={() => setCancellingOrderId(order._id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-red-100"
                            >
                                <FaBan size={12} /> Cancel
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    if (loading) {
        return <div className="text-center py-10">Loading orders...</div>;
    }

    return (
        <div className="relative">
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

            {/* New Order Popup */}
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
                            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 rounded-full flex items-center justify-center">
                                        <FaClock className="text-white text-xl sm:text-2xl" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">New Order Arrived!</h2>
                                        <p className="text-xs sm:text-sm text-gray-500">Order #{newOrderPopup._id.slice(-4)}</p>
                                    </div>
                                </div>
                                <div className="w-12 h-12 sm:w-14 sm:h-14 border-4 border-orange-500 rounded-full flex items-center justify-center">
                                    <span className="text-orange-500 font-bold text-sm">{countdown}s</span>
                                </div>
                            </div>

                            {/* Customer */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {getInitials(newOrderPopup.user?.name || 'Guest')}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{newOrderPopup.user?.name}</h3>
                                    <p className="text-xs text-gray-500">Regular Customer</p>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="flex items-start gap-2 mb-6 text-gray-600">
                                <FaMapMarkerAlt className="mt-1" />
                                <span className="text-sm">{newOrderPopup.shippingAddress?.address}</span>
                            </div>

                            {/* Items */}
                            <div className="mb-6">
                                <p className="font-semibold text-gray-700 mb-3">Order Items</p>
                                {newOrderPopup.orderItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between mb-2">
                                        <span className="text-gray-700">{item.name}</span>
                                        <span className="font-semibold text-gray-900">Rs. {item.price.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>Rs. {newOrderPopup.totalPrice.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setRejectingOrder(newOrderPopup._id);
                                        setNewOrderPopup(null);
                                    }}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-bold transition"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleAcceptOrder(newOrderPopup._id)}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-2xl font-bold transition"
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

            {/* Order Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 h-[calc(100vh-200px)] overflow-hidden">
                {/* Pending Column */}
                <div className="flex flex-col h-full">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm sm:text-base sticky top-0 bg-gray-50 z-10 py-1">
                        New
                        <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {pendingOrders.length}
                        </span>
                    </h3>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-20 custom-scrollbar">
                        {pendingOrders.map(renderOrderCard)}
                    </div>
                </div>

                {/* Preparing Column */}
                <div className="flex flex-col h-full">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm sm:text-base sticky top-0 bg-gray-50 z-10 py-1">
                        Preparing
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {preparingOrders.length}
                        </span>
                    </h3>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-20 custom-scrollbar">
                        {preparingOrders.map(renderOrderCard)}
                    </div>
                </div>

                {/* Ready Column */}
                <div className="flex flex-col h-full">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm sm:text-base sticky top-0 bg-gray-50 z-10 py-1">
                        Ready
                        <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {readyOrders.length}
                        </span>
                    </h3>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-20 custom-scrollbar">
                        {readyOrders.map(renderOrderCard)}
                    </div>
                </div>

                {/* Completed Column */}
                <div className="flex flex-col h-full">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm sm:text-base sticky top-0 bg-gray-50 z-10 py-1">
                        Completed
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {completedOrders.length}
                        </span>
                    </h3>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-20 custom-scrollbar">
                        {completedOrders.map(renderOrderCard)}
                    </div>
                </div>
            </div>

            {/* Chat Modal */}
            <AnimatePresence>
                {activeChat && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setActiveChat(null)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[80vh] sm:h-[600px] flex flex-col overflow-hidden shadow-2xl"
                        >
                            {/* Chat Header */}
                            <div className="p-4 bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                        <FaCommentDots size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Order #{activeChat._id.slice(-6)}</h3>
                                        <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
                                            Chat with {activeChat.user?.name}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveChat(null)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                                {(chatMessages[activeChat._id] || []).map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex flex-col ${msg.sender === 'restaurant' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${msg.sender === 'restaurant'
                                                ? 'bg-orange-500 text-white rounded-tr-none'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                }`}
                                        >
                                            <p className="font-medium">{msg.text}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 px-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">
                                                {msg.sender === 'restaurant' ? 'You' : msg.senderName}
                                            </span>
                                            <span className="text-[9px] text-gray-400">•</span>
                                            <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                                {(!chatMessages[activeChat._id] || chatMessages[activeChat._id].length === 0) && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
                                        <FaCommentDots size={40} />
                                        <p className="text-xs font-bold uppercase tracking-wider">No messages yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={currentMessage}
                                        onChange={(e) => setCurrentMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type your message..."
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!currentMessage.trim()}
                                        className="w-12 h-12 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95"
                                    >
                                        <FaCheck size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
