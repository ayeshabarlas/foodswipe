'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
    user: { name: string; phone: string; email: string };
    orderItems: { name: string; qty: number; price: number; product: string }[];
    totalPrice: number;
    status: 'Pending' | 'Accepted' | 'Preparing' | 'Ready' | 'OnTheWay' | 'Delivered' | 'Cancelled' | 'Picked Up';
    createdAt: string;
    shippingAddress: { address: string };
    paymentMethod: string;
    cancellationReason?: string;
    prepTime?: number;
    rider?: any;
}

interface OrderBoardProps {
    restaurant?: any;
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

    const fetchOrders = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get('http://localhost:5000/api/orders/restaurant/my-orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
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
                `http://localhost:5000/api/orders/${orderId}/status`,
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
    };

    // Filter orders by status
    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const preparingOrders = orders.filter(o => ['Accepted', 'Preparing'].includes(o.status));
    const readyOrders = orders.filter(o => o.status === 'Ready');
    const completedOrders = orders.filter(o => ['OnTheWay', 'Picked Up', 'Delivered'].includes(o.status));

    const renderOrderCard = (order: Order) => {
        const initials = getInitials(order.user?.name || 'Guest');
        const canTrack = ['OnTheWay', 'Picked Up'].includes(order.status);

        return (
            <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow border border-gray-100 hover:shadow-md transition"
            >
                {/* Customer Info */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {initials}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{order.user?.name || 'Guest'}</h3>
                        <p className="text-xs text-gray-500">Order #{order._id.slice(-4)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                        {order.status}
                    </span>
                </div>

                {/* Order Items */}
                <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Items:</p>
                    {order.orderItems.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-700 mb-1">
                            • {item.name}
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Total</span>
                    <span className="text-lg font-bold text-gray-900">Rs. {order.totalPrice.toFixed(2)}</span>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2 mb-4 text-sm text-gray-600">
                    <FaMapMarkerAlt className="mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{order.shippingAddress?.address}</span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        {order.status === 'Pending' && (
                            <>
                                <button
                                    onClick={() => handleAcceptOrder(order._id)}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => setRejectingOrder(order._id)}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
                                >
                                    Reject
                                </button>
                            </>
                        )}
                        {order.status === 'Accepted' && (
                            <button
                                onClick={() => updateStatus(order._id, 'Preparing')}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
                            >
                                Start Preparing
                            </button>
                        )}
                        {order.status === 'Preparing' && (
                            <button
                                onClick={() => updateStatus(order._id, 'Ready')}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
                            >
                                Mark Ready
                            </button>
                        )}
                        {order.status === 'Ready' && (
                            <button
                                onClick={() => updateStatus(order._id, 'OnTheWay')}
                                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
                            >
                                Hand to Rider
                            </button>
                        )}
                    </div>

                    {/* Track Order Button */}
                    {canTrack && (
                        <button
                            onClick={() => setTrackingOrder(order)}
                            className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
                        >
                            <FaMotorcycle /> Track Order
                        </button>
                    )}

                    {/* Cancel Order Button */}
                    {!['Delivered', 'Cancelled'].includes(order.status) && (
                        <button
                            onClick={() => setCancellingOrderId(order._id)}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 border border-red-200"
                        >
                            <FaBan size={14} />
                            Cancel
                        </button>
                    )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Pending Column */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm sm:text-base">
                        New
                        <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {pendingOrders.length}
                        </span>
                    </h3>
                    <div className="space-y-4">
                        {pendingOrders.map(renderOrderCard)}
                    </div>
                </div>

                {/* Preparing Column */}
                <div>
                    <h3 className="font-semibold text-gray- mb-4 flex items-center gap-2 text-sm sm:text-base">
                        Preparing
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {preparingOrders.length}
                        </span>
                    </h3>
                    <div className="space-y-4">
                        {preparingOrders.map(renderOrderCard)}
                    </div>
                </div>

                {/* Ready Column */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm sm:text-base">
                        Ready
                        <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {readyOrders.length}
                        </span>
                    </h3>
                    <div className="space-y-4">
                        {readyOrders.map(renderOrderCard)}
                    </div>
                </div>

                {/* Completed Column */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm sm:text-base">
                        Completed
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {completedOrders.length}
                        </span>
                    </h3>
                    <div className="space-y-4">
                        {completedOrders.map(renderOrderCard)}
                    </div>
                </div>
            </div>

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
