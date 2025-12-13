'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaClock, FaBiking, FaReceipt, FaSync } from 'react-icons/fa';
import axios from 'axios';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface MyOrdersProps {
    isOpen: boolean;
    onClose: () => void;
    onTrackOrder: (orderId: string) => void;
}

export interface MyOrdersRef {
    refresh: () => void;
}

interface Order {
    _id: string;
    restaurant: {
        _id: string;
        name: string;
        logo: string;
    };
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    totalAmount: number;
    status: string;
    createdAt: string;
    deliveryAddress: string;
}

const MyOrders = forwardRef<MyOrdersRef, MyOrdersProps>(({ isOpen, onClose, onTrackOrder }, ref) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Enable swipe back gesture
    useSwipeBack({ onSwipeBack: onClose });

    useEffect(() => {
        if (isOpen) {
            fetchOrders();
        }
    }, [isOpen]);

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
        refresh: () => fetchOrders()
    }));

    const fetchOrders = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError('');
            const token = localStorage.getItem('token');

            if (!token) {
                setOrders([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const response = await axios.get('http://localhost:5000/api/orders/my-orders', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOrders(response.data);
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setOrders([]);
            if (err.response?.status !== 401) {
                setError('Failed to load orders');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'delivering':
            case 'on the way':
                return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'preparing':
            case 'pending':
                return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'completed':
            case 'delivered':
                return 'bg-green-100 text-green-600 border-green-200';
            case 'cancelled':
                return 'bg-red-100 text-red-600 border-red-200';
            default:
                return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins} mins ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
        return date.toLocaleDateString();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-50 z-50 shadow-2xl overflow-y-auto no-scrollbar"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-orange-red p-4 shadow-md z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-white text-xl font-bold">My Orders</h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => fetchOrders(true)}
                                        disabled={refreshing}
                                        className={`w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition ${refreshing ? 'animate-spin' : ''}`}
                                    >
                                        <FaSync size={14} />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
                                    >
                                        <FaTimes size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-64">
                                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500">Loading orders...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="p-4">
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                    <p className="text-red-600">{error}</p>
                                    <button
                                        onClick={() => fetchOrders()}
                                        className="mt-3 text-red-600 font-medium hover:underline"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Orders List */}
                        {!loading && !error && orders.length > 0 && (
                            <div className="p-4 space-y-4">
                                {orders.map((order) => (
                                    <motion.div
                                        key={order._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={order.restaurant.logo || 'https://via.placeholder.com/50'}
                                                    alt={order.restaurant.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = 'https://via.placeholder.com/50';
                                                    }}
                                                />
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{order.restaurant.name}</h3>
                                                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3 pl-1">
                                            {order.items.map((item, index) => (
                                                <div key={index} className="flex items-start gap-2 text-sm text-gray-600 mb-1">
                                                    <span className="text-orange-500">•</span>
                                                    <span>{item.quantity}x {item.name}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </div>
                                            <p className="text-orange-500 font-bold text-lg">Rs. {order.totalAmount}</p>
                                        </div>

                                        {(order.status.toLowerCase() === 'delivering' || order.status.toLowerCase() === 'preparing' || order.status.toLowerCase() === 'pending') && (
                                            <button
                                                onClick={() => onTrackOrder(order._id)}
                                                className="w-full bg-gradient-orange-red text-white py-3 rounded-full font-bold hover:shadow-lg transition"
                                            >
                                                Track Order
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !error && orders.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                                <FaReceipt size={48} className="text-gray-300 mb-4" />
                                <p className="text-lg font-medium text-gray-700">No orders yet</p>
                                <p className="text-sm text-gray-500 mt-2">Your order history will appear here when you place your first order</p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

MyOrders.displayName = 'MyOrders';
export default MyOrders;
