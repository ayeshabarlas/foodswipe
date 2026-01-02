'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaClock, FaMotorcycle, FaStore, FaUser, FaPhone, FaMapMarkerAlt, FaSyncAlt, FaShoppingBag } from 'react-icons/fa';

interface Order {
    _id: string;
    orderNumber: string;
    user: { name: string; phone: string };
    restaurant: { name: string; address: string };
    rider?: { user: { name: string }; phone?: string };
    items: any[];
    totalAmount: number;
    status: string;
    createdAt: string;
    commission?: number;
    deliveryFee?: number;
}

export default function OrdersView() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchOrders();

        const socket = io(SOCKET_URL);

        const handleUpdate = () => {
            if (autoRefresh) {
                console.log('Order update detected, refreshing list...');
                fetchOrders();
            }
        };

        socket.on('order_created', handleUpdate);
        socket.on('order_updated', handleUpdate);

        return () => {
            socket.disconnect();
        };
    }, [autoRefresh]);

    const fetchOrders = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get(`${API_BASE_URL}/api/admin/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter only live orders
            const data = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
            const live = data.filter((o: any) =>
                ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Picked Up', 'On the Way'].includes(o.status)
            );
            setOrders(live);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setLoading(false);
        }
    };

    const stats = {
        live: orders?.length || 0,
        preparing: Array.isArray(orders) ? orders.filter(o => o.status === 'Preparing' || o.status === 'Confirmed').length : 0,
        outForDelivery: Array.isArray(orders) ? orders.filter(o => o.status === 'On the Way' || o.status === 'Picked Up').length : 0,
        totalValue: Array.isArray(orders) ? orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) : 0
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Preparing': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'On the Way': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'Pending': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Live Orders</h2>
                    <p className="text-gray-500">Real-time order tracking and management</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 text-orange-500 rounded"
                        />
                        Auto Refresh
                    </label>
                    <button
                        onClick={fetchOrders}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition"
                    >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg font-medium hover:bg-orange-100 transition">
                        View All Orders
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 pb-2">
                    <p className="text-gray-500 text-sm mb-1">Live Orders</p>
                    <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-bold text-gray-800">{stats.live}</h3>
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600 mb-2">
                            <FaClock />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 pb-2">
                    <p className="text-gray-500 text-sm mb-1">Preparing</p>
                    <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-bold text-gray-800">{stats.preparing}</h3>
                        <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600 mb-2">
                            <FaStore />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 pb-2">
                    <p className="text-gray-500 text-sm mb-1">Out for Delivery</p>
                    <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-bold text-gray-800">{stats.outForDelivery}</h3>
                        <div className="bg-green-100 p-2 rounded-lg text-green-600 mb-2">
                            <FaMotorcycle />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 pb-2">
                    <p className="text-gray-500 text-sm mb-1">Total Value</p>
                    <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-bold text-gray-800">Rs {stats.totalValue.toLocaleString()}</h3>
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600 mb-2">
                            <span className="font-bold text-lg">$</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
                    {orders.map((order) => (
                        <motion.div
                            key={order._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-1">Order #{order.orderNumber || order._id.slice(-6)}</h3>
                                <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaUser className="text-gray-400 text-sm" />
                                        <span className="text-sm font-semibold text-gray-700">{order.user?.name || 'Guest'}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 ml-6">{order.user?.phone || 'No phone'}</p>
                                    <div className="flex items-center gap-2 mt-2 ml-6 text-xs text-gray-500">
                                        <FaMapMarkerAlt /> {order.restaurant.address ? 'Delivery Address' : 'Karachi, Pakistan'}
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-3">
                                        <p className="text-xs text-gray-400 mb-1">Restaurant</p>
                                        <div className="flex items-center gap-2">
                                            <FaStore className="text-orange-500" />
                                            <span className="text-sm font-semibold text-gray-800">{order.restaurant?.name}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Rider</p>
                                        <div className="flex items-center gap-2">
                                            <FaMotorcycle className="text-blue-500" />
                                            <span className="text-sm font-semibold text-gray-800">{order.rider?.user?.name || 'Not Assigned'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm">
                                <div>
                                    <span className="text-gray-500">{order.items?.length || 0} items</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-gray-500">Delivery: Rs {order.deliveryFee || 0}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-gray-800">Rs {(order.totalAmount || 0).toLocaleString()}</p>
                                    <p className="text-xs text-green-500">Commission: Rs {Math.round((order.totalAmount || 0) * 0.1)}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-3">
                                <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 rounded-lg transition shadow-lg shadow-orange-500/20">
                                    View Details
                                </button>
                                <a href={`tel:${order.user?.phone}`} className="px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                                    <FaPhone />
                                </a>
                                <a href={`tel:${order.rider?.phone}`} className="px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                                    <FaMotorcycle />
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {orders.length === 0 && !loading && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
                        <FaShoppingBag className="text-5xl mb-4 opacity-20" />
                        <p>No active live orders</p>
                    </div>
                )}
            </div>
        </div>
    );
}
