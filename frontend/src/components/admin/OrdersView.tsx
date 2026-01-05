'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaClock, FaMotorcycle, FaStore, FaUser, FaPhone, FaMapMarkerAlt, FaSyncAlt, FaShoppingBag, FaDollarSign } from 'react-icons/fa';

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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Live Orders</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Real-time order tracking and management</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-3.5 h-3.5 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                        />
                        Auto Refresh
                    </label>
                    <button
                        onClick={fetchOrders}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition text-xs font-bold"
                    >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-xs font-bold hover:bg-orange-100 transition">
                        View All Orders
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Live Orders</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.live}</h3>
                    </div>
                    <div className="bg-orange-50 p-2.5 rounded-lg text-orange-500">
                        <FaClock className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Preparing</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.preparing}</h3>
                    </div>
                    <div className="bg-yellow-50 p-2.5 rounded-lg text-yellow-500">
                        <FaStore className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Out for Delivery</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.outForDelivery}</h3>
                    </div>
                    <div className="bg-green-50 p-2.5 rounded-lg text-green-500">
                        <FaMotorcycle className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Total Value</p>
                        <h3 className="text-xl font-bold text-gray-800">Rs. {stats.totalValue.toLocaleString()}</h3>
                    </div>
                    <div className="bg-purple-50 p-2.5 rounded-lg text-purple-500">
                        <FaDollarSign className="text-lg" />
                    </div>
                </div>
            </div>

            {/* Order Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
                    {orders.map((order) => (
                        <motion.div
                            key={order._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-gray-800 mb-0.5">Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}</h3>
                                <p className="text-[10px] text-gray-500 font-medium">{new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <FaUser className="text-gray-400 text-[10px]" />
                                        <span className="text-xs font-bold text-gray-700">{order.user?.name || 'Guest'}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 ml-4.5 font-medium">{order.user?.phone || 'No phone'}</p>
                                    <div className="flex items-center gap-2 mt-1 ml-4.5 text-[10px] text-gray-400 font-medium">
                                        <FaMapMarkerAlt className="text-[8px]" /> {order.restaurant.address ? 'Delivery Address' : 'Karachi, Pakistan'}
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-2">
                                        <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Restaurant</p>
                                        <div className="flex items-center gap-2">
                                            <FaStore className="text-orange-500 text-xs" />
                                            <span className="text-xs font-bold text-gray-800">{order.restaurant?.name}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Rider</p>
                                        <div className="flex items-center gap-2">
                                            <FaMotorcycle className="text-blue-500 text-xs" />
                                            <span className="text-xs font-bold text-gray-800">{order.rider?.user?.name || 'Not Assigned'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-[11px]">
                                <div>
                                    <span className="text-gray-500 font-medium">{order.items?.length || 0} items</span>
                                    <span className="mx-2 text-gray-200">|</span>
                                    <span className="text-gray-500 font-medium">Delivery: Rs. {order.deliveryFee || 0}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800 leading-tight">Rs. {(order.totalAmount || 0).toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-green-600">Comm: Rs. {Math.round((order.totalAmount || 0) * 0.1)}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg transition shadow-md shadow-orange-500/20">
                                    View Details
                                </button>
                                <a href={`tel:${order.user?.phone}`} className="px-2.5 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition">
                                    <FaPhone className="text-xs" />
                                </a>
                                <a href={`tel:${order.rider?.phone}`} className="px-2.5 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition">
                                    <FaMotorcycle className="text-xs" />
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
