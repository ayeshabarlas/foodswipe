'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { API_BASE_URL } from '../../utils/config';
import { FaClock, FaMotorcycle, FaStore, FaUser, FaPhone, FaMapMarkerAlt, FaSyncAlt, FaShoppingBag } from 'react-icons/fa';

interface Order {
    _id: string;
    orderNumber: string;
    user: { name: string; phone: string; email?: string };
    restaurant: { name: string; address: string };
    rider?: { user: { name: string; phone?: string }; phone?: string };
    orderItems: any[];
    totalPrice: number;
    status: string;
    createdAt: string;
    commissionPercent?: number;
    commissionAmount?: number;
    deliveryFee?: number;
    shippingAddress?: {
        address: string;
        city: string;
        postalCode: string;
        country: string;
    };
    adminEarning?: number;
}

export default function OrdersView() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        fetchOrders();

        const socket = getSocket();

        if (socket) {
            const handleUpdate = () => {
                if (autoRefresh) {
                    console.log('Order update detected, refreshing list...');
                    fetchOrders();
                }
            };

            socket.on('order_created', handleUpdate);
            socket.on('order_updated', handleUpdate);

            return () => {
                socket.off('order_created', handleUpdate);
                socket.off('order_updated', handleUpdate);
            };
        }
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
                ['Pending', 'Accepted', 'Confirmed', 'Preparing', 'Ready', 'OnTheWay', 'Arrived', 'Picked Up', 'ArrivedAtCustomer'].includes(o.status)
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
        totalValue: Array.isArray(orders) ? orders.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0) : 0
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
            case 'Accepted':
            case 'Confirmed': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'Preparing': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'Ready': return 'bg-green-100 text-green-600 border-green-200';
            case 'OnTheWay':
            case 'Picked Up': return 'bg-purple-100 text-purple-600 border-purple-200';
            case 'Arrived':
            case 'ArrivedAtCustomer': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
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
                                        <FaMapMarkerAlt className="text-[10px]" /> {order.shippingAddress?.address || 'Address not provided'}
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
                                    <span className="text-[#6B7280] font-medium">{order.orderItems?.length || 0} items</span>
                                    <span className="mx-2 text-gray-200">|</span>
                                    <span className="text-[#6B7280] font-medium">Delivery: Rs. {order.deliveryFee || 0}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[16px] font-bold text-[#111827] leading-tight">Rs. {(order.totalPrice || 0).toLocaleString()}</p>
                                    <p className="text-[12px] font-semibold text-green-600 mt-0.5">Comm: Rs. {(order.commissionAmount || Math.round((order.totalPrice || 0) * 0.1)).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="mt-5 flex gap-3">
                                <button 
                                    onClick={() => {
                                        setSelectedOrder(order);
                                        setShowDetailsModal(true);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:shadow-lg hover:shadow-orange-500/30 text-white text-[14px] font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-widest">
                                    View Details
                                </button>
                                <a href={`tel:${order.user?.phone}`} className="px-4 py-3 border border-gray-100 rounded-xl hover:bg-gray-50 text-[#6B7280] transition-all shadow-sm active:scale-95 flex items-center justify-center">
                                    <FaPhone className="text-[14px]" />
                                </a>
                                <a href={`tel:${order.rider?.user?.phone || order.rider?.phone}`} className="px-4 py-3 border border-gray-100 rounded-xl hover:bg-gray-50 text-[#6B7280] transition-all shadow-sm active:scale-95 flex items-center justify-center">
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

            {/* Order Details Modal */}
            <AnimatePresence>
                {showDetailsModal && selectedOrder && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
                        >
                            <button 
                                onClick={() => setShowDetailsModal(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <FaClock className="text-gray-400 rotate-45" />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                                    <FaReceipt size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Live Order Details</h2>
                                    <p className="text-gray-500 font-medium">#{selectedOrder.orderNumber || selectedOrder._id}</p>
                                </div>
                                <div className="ml-auto mr-8">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(selectedOrder.status)}`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Customer Info</p>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400">
                                                <FaUser size={14} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{selectedOrder.user?.name}</p>
                                                <p className="text-sm text-gray-500">{selectedOrder.user?.email || 'No email'}</p>
                                                <p className="text-sm text-gray-500">{selectedOrder.user?.phone || 'No phone'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Restaurant Info</p>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400">
                                                <FaStore size={14} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{selectedOrder.restaurant?.name}</p>
                                                <p className="text-sm text-gray-500">{selectedOrder.restaurant?.address || 'No address'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Delivery Address</p>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400">
                                                <FaMapMarkerAlt size={14} />
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {selectedOrder.shippingAddress?.address || 'No address provided'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Rider Info</p>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400">
                                                <FaMotorcycle size={14} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{selectedOrder.rider?.user?.name || 'Not Assigned'}</p>
                                                <p className="text-sm text-gray-500">{selectedOrder.rider?.user?.phone || 'Rider Partner'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-3xl p-6">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Summary</p>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Method</span>
                                                <span className="font-bold text-gray-900 uppercase">{selectedOrder.paymentMethod}</span>
                                            </div>
                                            {selectedOrder.transactionId && (
                                                <div className="flex justify-between text-sm bg-orange-100 p-2 rounded-lg border border-orange-200">
                                                    <span className="text-orange-700 font-bold">TID</span>
                                                    <span className="font-black text-orange-900">{selectedOrder.transactionId}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Subtotal</span>
                                                <span className="font-bold text-gray-900">Rs. {(selectedOrder.totalPrice - (selectedOrder.deliveryFee || 0)).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Delivery Fee</span>
                                                <span className="font-bold text-gray-900">Rs. {selectedOrder.deliveryFee?.toLocaleString()}</span>
                                            </div>
                                            <div className="border-t border-gray-200 pt-3 flex justify-between">
                                                <span className="text-sm font-bold text-gray-900">Total Price</span>
                                                <span className="font-bold text-orange-600 text-lg">Rs. {selectedOrder.totalPrice?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-[12px] pt-1">
                                                <span className="text-gray-400 italic">Platform Commission</span>
                                                <span className="font-bold text-green-600">Rs. {(selectedOrder.commissionAmount || Math.round((selectedOrder.totalPrice || 0) * 0.1)).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Order Items</p>
                                <div className="space-y-3">
                                    {selectedOrder.orderItems?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[12px] font-bold text-orange-500 border border-gray-100">
                                                    {item.qty}x
                                                </div>
                                                <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">Rs. {(item.price * item.qty).toLocaleString()}</p>
                                        </div>
                                    ))}
                                    {(!selectedOrder.orderItems || selectedOrder.orderItems.length === 0) && (
                                        <p className="text-center text-gray-400 text-sm py-4">No items data available</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
