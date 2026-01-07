'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck, FaClock, FaMapMarkerAlt, FaCommentDots, FaBan, FaMotorcycle, FaShoppingBag } from 'react-icons/fa';
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
            const orderId = updatedOrder._id || updatedOrder.orderId;
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: updatedOrder.status } : o));
            fetchOrders(); // Refresh to get full details
        });

        socket?.on('riderPickedUp', () => {
            fetchOrders();
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
    const pendingOrders = ordersArray.filter(o => o.status === 'Pending');
    const preparingOrders = ordersArray.filter(o => ['Accepted', 'Preparing'].includes(o.status));
    const readyOrders = ordersArray.filter(o => o.status === 'Ready');
    const completedOrders = ordersArray.filter(o => ['OnTheWay', 'Picked Up', 'Delivered'].includes(o.status));

    const renderOrderCard = (order: Order) => {
        const initials = order.user?.name
            ? order.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            : '??';
        
        const canTrack = ['OnTheWay', 'Picked Up'].includes(order.status);
        
        return (
            <motion.div
                key={order._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition group"
            >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm">
                            {initials}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-xs truncate max-w-[120px]">{order.user?.name || 'Guest'}</h4>
                            <p className="text-[10px] text-gray-400 font-medium">#{order._id.slice(-6)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-gray-900 text-xs">Rs. {order.totalPrice.toFixed(0)}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Items Summary */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="space-y-1.5">
                        {order.orderItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                                <span className="text-gray-600 font-medium">
                                    <span className="text-orange-600 font-black mr-1">{item.qty}x</span>
                                    {item.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    {order.status === 'Pending' && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleAcceptOrder(order._id)}
                                className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl font-bold text-[10px] transition shadow-sm shadow-orange-500/20"
                            >
                                ACCEPT
                            </button>
                            <button
                                onClick={() => setRejectingOrder(order._id)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-500 py-2 rounded-xl font-bold text-[10px] transition"
                            >
                                REJECT
                            </button>
                        </div>
                    )}
                    
                    {order.status === 'Accepted' && (
                        <div className="space-y-2">
                            <select
                                className="w-full bg-blue-50 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold text-blue-600 focus:ring-0"
                                value={prepTimes[order._id] || 25}
                                onChange={(e) => setPrepTimes({ ...prepTimes, [order._id]: parseInt(e.target.value) })}
                            >
                                {[15, 25, 35, 45, 60].map(m => (
                                    <option key={m} value={m}>{m} MINS PREP</option>
                                ))}
                            </select>
                            <button
                                onClick={() => updateStatus(order._id, 'Preparing', { prepTime: prepTimes[order._id] || 25 })}
                                className="w-full bg-blue-500 text-white py-2 rounded-xl font-bold text-[10px] hover:bg-blue-600 transition"
                            >
                                START PREPARING
                            </button>
                        </div>
                    )}

                    {order.status === 'Preparing' && (
                        <button
                            onClick={() => updateStatus(order._id, 'Ready')}
                            className="w-full bg-green-500 text-white py-2 rounded-xl font-bold text-[10px] hover:bg-green-600 transition"
                        >
                            MARK AS READY
                        </button>
                    )}

                    {order.status === 'Ready' && (
                        <button
                            onClick={() => updateStatus(order._id, 'OnTheWay')}
                            className="w-full bg-purple-500 text-white py-2 rounded-xl font-bold text-[10px] hover:bg-purple-600 transition"
                        >
                            HAND TO RIDER
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setActiveChat(order)}
                            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-50 text-gray-500 font-bold text-[9px] hover:bg-gray-100 transition border border-gray-100"
                        >
                            <FaCommentDots size={10} /> CHAT
                        </button>
                        {canTrack && (
                            <button
                                onClick={() => setTrackingOrder(order)}
                                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold text-[9px] hover:bg-blue-100 transition border border-blue-100"
                            >
                                <FaMotorcycle size={10} /> TRACK
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
        <div className="h-full flex flex-col overflow-hidden">
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
