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
                    <h2 className="text-[28px] font-bold text-[#111827] tracking-tight">Live Orders</h2>
                    <p className="text-[14px] font-medium text-[#6B7280] mt-1">Real-time order tracking and management</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[13px] font-bold text-[#6B7280] cursor-pointer hover:bg-gray-50 transition-all shadow-sm">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 text-[#FF6A00] rounded border-gray-300 focus:ring-[#FF6A00] transition-all"
                        />
                        Auto Refresh
                    </label>
                    <button
                        onClick={fetchOrders}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-xl hover:shadow-lg text-[#6B7280] transition-all text-[13px] font-bold hover:text-orange-500 hover:border-orange-500 shadow-sm active:scale-95 uppercase tracking-widest"
                    >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-[13px] font-bold hover:shadow-xl hover:shadow-orange-500/30 transition-all shadow-lg active:scale-95 uppercase tracking-widest">
                        View All Orders
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Live Orders', value: stats.live, icon: FaClock, gradient: 'from-orange-500 to-pink-500' },
                    { label: 'Preparing', value: stats.preparing, icon: FaStore, gradient: 'from-blue-500 to-indigo-600' },
                    { label: 'Out for Delivery', value: stats.outForDelivery, icon: FaMotorcycle, gradient: 'from-emerald-500 to-teal-600' },
                    { label: 'Total Value', value: `Rs. ${stats.totalValue.toLocaleString()}`, icon: FaShoppingBag, gradient: 'from-purple-500 to-indigo-600' }
                ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.gradient} p-8 rounded-[2rem] shadow-xl relative overflow-hidden group active:scale-[0.98] transition-all cursor-default text-white`}>
                        {/* Decorative background elements */}
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        
                        <div className="relative z-10">
                            <p className="text-white/70 text-[11px] font-bold uppercase tracking-[0.15em] mb-2">{stat.label}</p>
                            <h3 className="text-[32px] font-bold text-white tracking-tight leading-none mb-4">{stat.value}</h3>
                        </div>

                        <div className="relative z-10 mt-2 bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
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
                                <button className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:shadow-lg hover:shadow-orange-500/30 text-white text-[14px] font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-widest">
                                    View Details
                                </button>
                                <a href={`tel:${order.user?.phone}`} className="px-4 py-3 border border-gray-100 rounded-xl hover:bg-gray-50 text-[#6B7280] transition-all shadow-sm active:scale-95 flex items-center justify-center">
                                    <FaPhone className="text-[14px]" />
                                </a>
                                <a href={`tel:${order.rider?.phone}`} className="px-4 py-3 border border-gray-100 rounded-xl hover:bg-gray-50 text-[#6B7280] transition-all shadow-sm active:scale-95 flex items-center justify-center">
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
