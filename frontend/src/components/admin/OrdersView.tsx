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
        preparing: Array.isArray(orders) ? orders.filter(o => ['Confirmed', 'Accepted', 'Preparing', 'Ready'].includes(o.status)).length : 0,
        outForDelivery: Array.isArray(orders) ? orders.filter(o => ['OnTheWay', 'Picked Up', 'Arrived', 'ArrivedAtCustomer'].includes(o.status)).length : 0,
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
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Live Orders</h2>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Real-time order tracking and management</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 text-[#FF6A00] rounded border-gray-300 focus:ring-[#FF6A00]"
                        />
                        Auto Refresh
                    </label>
                    <button
                        onClick={fetchOrders}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl hover:shadow-md text-[#6B7280] transition-all text-[14px] font-medium"
                    >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="px-5 py-2.5 bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20 rounded-xl text-[14px] font-medium hover:bg-[#FF6A00]/20 transition-all">
                        View All Orders
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Live Orders', value: stats.live, icon: FaClock, color: 'orange' },
                    { label: 'Preparing', value: stats.preparing, icon: FaStore, color: 'yellow' },
                    { label: 'Out for Delivery', value: stats.outForDelivery, icon: FaMotorcycle, color: 'green' },
                    { label: 'Total Value', value: `Rs. ${stats.totalValue.toLocaleString()}`, icon: 'Rs', color: 'purple' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-[#6B7280] text-[13px] font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-[24px] font-bold text-[#111827] tracking-tight">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-2xl ${
                            stat.color === 'orange' ? 'bg-orange-50 text-orange-500' :
                            stat.color === 'yellow' ? 'bg-yellow-50 text-yellow-500' :
                            stat.color === 'green' ? 'bg-green-50 text-green-500' :
                            'bg-purple-50 text-purple-500'
                        }`}>
                            {typeof stat.icon === 'string' ? <span className="text-lg font-bold">{stat.icon}</span> : <stat.icon className="text-xl" />}
                        </div>
                    </div>
                ))}
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
                                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${getStatusColor(order.status)} uppercase tracking-wider`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="mb-4">
                                <h3 className="text-[16px] font-bold text-[#111827] mb-1">Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}</h3>
                                <p className="text-[13px] text-[#6B7280] font-normal">{new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <FaUser className="text-[#9CA3AF] text-[12px]" />
                                        <span className="text-[14px] font-semibold text-[#374151]">{order.user?.name || 'Guest'}</span>
                                    </div>
                                    <p className="text-[13px] text-[#6B7280] ml-5 font-normal">{order.user?.phone || 'No phone'}</p>
                                    <div className="flex items-center gap-2 mt-1.5 ml-5 text-[12px] text-[#9CA3AF] font-normal">
                                        <FaMapMarkerAlt className="text-[10px]" /> {order.restaurant.address ? 'Delivery Address' : 'Karachi, Pakistan'}
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-3">
                                        <p className="text-[11px] text-[#9CA3AF] uppercase font-semibold mb-1 tracking-wider">Restaurant</p>
                                        <div className="flex items-center gap-2">
                                            <FaStore className="text-[#FF6A00] text-[13px]" />
                                            <span className="text-[14px] font-semibold text-[#111827]">{order.restaurant?.name}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#9CA3AF] uppercase font-semibold mb-1 tracking-wider">Rider</p>
                                        <div className="flex items-center gap-2">
                                            <FaMotorcycle className="text-blue-500 text-[13px]" />
                                            <span className="text-[14px] font-semibold text-[#111827]">{order.rider?.user?.name || 'Not Assigned'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-[13px]">
                                <div>
                                    <span className="text-[#6B7280] font-medium">{order.items?.length || 0} items</span>
                                    <span className="mx-2 text-gray-200">|</span>
                                    <span className="text-[#6B7280] font-medium">Delivery: Rs. {order.deliveryFee || 0}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[16px] font-bold text-[#111827] leading-tight">Rs. {(order.totalAmount || 0).toLocaleString()}</p>
                                    <p className="text-[12px] font-semibold text-green-600 mt-0.5">Comm: Rs. {Math.round((order.totalAmount || 0) * 0.1)}</p>
                                </div>
                            </div>

                            <div className="mt-5 flex gap-3">
                                <button className="flex-1 bg-[#FF6A00] hover:bg-[#e65f00] text-white text-[14px] font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-[#FF6A00]/20">
                                    View Details
                                </button>
                                <a href={`tel:${order.user?.phone}`} className="px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-[#6B7280] transition-all">
                                    <FaPhone className="text-[14px]" />
                                </a>
                                <a href={`tel:${order.rider?.phone}`} className="px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-[#6B7280] transition-all">
                                    <FaMotorcycle className="text-[14px]" />
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
