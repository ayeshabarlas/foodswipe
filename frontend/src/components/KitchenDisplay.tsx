'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaClock, FaBox, FaCheckCircle, FaUtensils, FaExclamationCircle } from 'react-icons/fa';
import axios from 'axios';

interface OrderItem {
    product: any;
    name: string;
    qty: number;
    price: number;
    customizations?: string;
}

interface Order {
    _id: string;
    orderNumber: string;
    user: { name: string };
    orderItems: OrderItem[];
    status: string;
    createdAt: string;
    estimatedTime?: number;
}

export default function KitchenDisplay() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    const fetchOrders = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get('http://localhost:5000/api/orders/restaurant/my-orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 3000); // Poll every 3s for real-time
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, []);

    const getTimeAgo = (date: string) => {
        const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        return diff === 0 ? 'Just now' : `${diff} min${diff > 1 ? 's' : ''} ago`;
    };

    const getTimeRemaining = (createdAt: string, estimatedTime: number = 20) => {
        const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
        const remaining = estimatedTime - elapsed;
        return Math.max(0, remaining);
    };

    const newOrders = orders.filter(o => o.status === 'Pending');
    const preparingOrders = orders.filter(o => ['Accepted', 'Preparing'].includes(o.status));
    const readyOrders = orders.filter(o => o.status === 'Ready');

    const OrderCard = ({ order, showTimer }: { order: Order; showTimer?: boolean }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition"
        >
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className="text-white font-bold">Order #{order.orderNumber || order._id.slice(-4)}</h4>
                    <p className="text-gray-400 text-sm">{order.user?.name || 'Guest'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FaClock />
                    <span>{getTimeAgo(order.createdAt)}</span>
                </div>
            </div>

            {showTimer && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-3">
                    <div className="text-xs text-blue-300 mb-1">Time Remaining</div>
                    <div className="text-2xl font-bold text-blue-400">
                        {getTimeRemaining(order.createdAt)} min
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {order.orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg">
                        <span className="text-white text-sm">{item.name}</span>
                        <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                            x{item.qty}
                        </span>
                    </div>
                ))}
            </div>

            {order.orderItems.some(item => item.customizations) && (
                <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
                    <FaExclamationCircle />
                    <span>Special instructions</span>
                </div>
            )}
        </motion.div>
    );

    return (
        <div className="p-6 space-y-6 max-w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500 rounded-xl">
                            <FaUtensils className="text-2xl text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Kitchen Display System</h2>
                            <p className="text-gray-400 text-sm">Real-time order tracking</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-white">
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-gray-400 text-sm">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {newOrders.length}
                        </div>
                        <span className="text-orange-400 font-medium">New</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {preparingOrders.length}
                        </div>
                        <span className="text-blue-400 font-medium">Preparing</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {readyOrders.length}
                        </div>
                        <span className="text-green-400 font-medium">Ready</span>
                    </div>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New Orders */}
                <div className="space-y-4">
                    <div className="bg-orange-500/20 border-2 border-orange-500 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-white font-bold">
                            <FaClock className="text-xl" />
                            <span>New Orders ({newOrders.length})</span>
                        </div>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {newOrders.map(order => (
                            <OrderCard key={order._id} order={order} />
                        ))}
                        {newOrders.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <FaClock className="text-4xl mx-auto mb-2 opacity-50" />
                                <p>No new orders</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preparing */}
                <div className="space-y-4">
                    <div className="bg-blue-500/20 border-2 border-blue-500 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-white font-bold">
                            <FaBox className="text-xl" />
                            <span>Preparing ({preparingOrders.length})</span>
                        </div>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {preparingOrders.map(order => (
                            <OrderCard key={order._id} order={order} showTimer />
                        ))}
                        {preparingOrders.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <FaBox className="text-4xl mx-auto mb-2 opacity-50" />
                                <p>No orders cooking</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ready */}
                <div className="space-y-4">
                    <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-white font-bold">
                            <FaCheckCircle className="text-xl" />
                            <span>Ready for Pickup ({readyOrders.length})</span>
                        </div>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {readyOrders.map(order => (
                            <OrderCard key={order._id} order={order} />
                        ))}
                        {readyOrders.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <FaCheckCircle className="text-4xl mx-auto mb-2 opacity-50" />
                                <p>No orders ready</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
