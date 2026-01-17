'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { API_BASE_URL } from '../../utils/config';
import { FaSearch, FaFilter, FaCalendarAlt, FaDownload, FaReceipt, FaSyncAlt } from 'react-icons/fa';

interface Order {
    _id: string;
    orderNumber: string;
    createdAt: string;
    user: { name: string };
    restaurant: { name: string };
    rider: { user: { name: string } };
    items: any[];
    totalAmount: number;
    status: string;
    commissionPercent?: number;
    commissionAmount?: number;
    restaurantEarning?: number;
    riderEarning?: number;
    adminEarning?: number;
}

export default function EnhancedOrdersView() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchOrders();

        const socket = getSocket();
        
        if (socket) {
            const handleUpdate = () => {
                if (autoRefresh) {
                    console.log('Real-time update: Refreshing enhanced orders...');
                    fetchOrders();
                }
            };

            socket.on('order_created', handleUpdate);
            socket.on('order_updated', handleUpdate);
            socket.on('stats_updated', handleUpdate);

            return () => {
                socket.off('order_created', handleUpdate);
                socket.off('order_updated', handleUpdate);
                socket.off('stats_updated', handleUpdate);
            };
        }
    }, [autoRefresh]);

    const fetchOrders = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            // Fetch all orders
            const res = await axios.get(`${API_BASE_URL}/api/admin/orders`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setOrders(Array.isArray(res.data) ? res.data : (res.data?.orders || []));
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            // Silence but log
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        totalOrders: orders?.length || 0,
        totalRevenue: Array.isArray(orders) ? orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) : 0,
        commission: Array.isArray(orders) ? orders.reduce((acc, curr) => acc + (curr.adminEarning || curr.commissionAmount || Math.round((curr.totalAmount || 0) * 0.1)), 0) : 0,
        avgOrderValue: (Array.isArray(orders) && orders.length > 0) ? Math.round(orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) / orders.length) : 0
    };

    const filteredOrders = Array.isArray(orders) ? orders.filter(o => {
        const term = searchTerm.toLowerCase();
        return (o._id && o._id.toLowerCase().includes(term)) ||
            (o.user?.name && o.user.name.toLowerCase().includes(term)) ||
            (o.restaurant?.name && o.restaurant.name.toLowerCase().includes(term));
    }) : [];

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">All Orders</h2>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full border border-green-100">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[11px] font-bold text-green-600 uppercase tracking-tight">Live Updates</span>
                        </div>
                    </div>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Complete order history and management</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-2.5 border border-gray-100 rounded-xl bg-white text-[#6B7280] text-[13px] font-bold uppercase tracking-wider hover:text-orange-500 hover:border-orange-500 transition-all shadow-sm active:scale-95">
                        <FaCalendarAlt /> Date Range
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-[13px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-orange-500/20 transition-all active:scale-95">
                        <FaDownload /> Export
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-6 rounded-[2rem] text-white shadow-xl shadow-orange-500/10 relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] mb-2 font-bold uppercase tracking-widest">Total Orders</p>
                        <h3 className="text-[28px] font-bold tracking-tight">{stats.totalOrders}</h3>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-500/10 relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] mb-2 font-bold uppercase tracking-widest">Total Revenue</p>
                        <h3 className="text-[28px] font-bold tracking-tight">Rs. {stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-500/10 relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] mb-2 font-bold uppercase tracking-widest">Platform Commission</p>
                        <h3 className="text-[28px] font-bold tracking-tight">Rs. {stats.commission.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-6 rounded-[2rem] text-white shadow-xl shadow-purple-500/10 relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] mb-2 font-bold uppercase tracking-widest">Avg Order Value</p>
                        <h3 className="text-[28px] font-bold tracking-tight">Rs. {stats.avgOrderValue.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[300px]">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        placeholder="Search by ID, customer or restaurant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-orange-500/20 focus:bg-white rounded-2xl text-[14px] font-medium transition-all placeholder:text-gray-400 outline-none"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-3.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all border border-gray-100 active:scale-95">
                        <FaFilter className="text-sm" />
                    </button>
                    <button
                        onClick={() => fetchOrders()}
                        disabled={loading}
                        className={`p-3.5 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-100 transition-all border border-orange-100 active:scale-95 ${loading ? 'animate-spin' : ''}`}
                    >
                        <FaSyncAlt className="text-sm" />
                    </button>
                </div>
                <div className="flex items-center gap-4 ml-auto pr-4 border-l border-gray-100 pl-8">
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Auto Refresh</span>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`w-12 h-6 rounded-full transition-all relative ${autoRefresh ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${autoRefresh ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-5 text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Order Info</th>
                                <th className="px-6 py-5 text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Customer / Restaurant</th>
                                <th className="px-6 py-5 text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-5 text-[13px] font-medium text-[#6B7280] uppercase tracking-wider text-center">Commission</th>
                                <th className="px-6 py-5 text-[13px] font-medium text-[#6B7280] uppercase tracking-wider text-center">Payouts</th>
                                <th className="px-6 py-5 text-[13px] font-medium text-[#6B7280] uppercase tracking-wider text-center">Profit</th>
                                <th className="px-6 py-5 text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-5 text-[13px] font-medium text-[#6B7280] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-6 py-6 h-20 bg-gray-50/20"></td>
                                    </tr>
                                ))
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-[#9CA3AF] text-[14px]">No orders found matching your search.</td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                                                    <FaReceipt className="text-sm" />
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-bold text-[#111827]">#{order.orderNumber || order._id.slice(-6)}</p>
                                                    <p className="text-[12px] text-gray-400 font-medium">{new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-0.5">
                                                <p className="text-[14px] font-bold text-[#111827]">{order.user?.name || 'Guest'}</p>
                                                <p className="text-[12px] text-orange-500 font-bold uppercase tracking-tight">@{order.restaurant?.name || 'Restaurant'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-[14px] font-bold text-[#111827]">Rs. {(order.totalAmount || 0).toLocaleString()}</p>
                                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Gross Sales</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="inline-block">
                                                <p className="text-[14px] font-bold text-red-500">Rs. {(order.commissionAmount || 0).toLocaleString()}</p>
                                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{order.commissionPercent || 0}% Fee</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Partner:</span>
                                                    <span className="text-[12px] font-bold text-green-600">Rs. {(order.restaurantEarning || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Rider:</span>
                                                    <span className="text-[12px] font-bold text-blue-600">Rs. {(order.riderEarning || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <p className="text-[14px] font-bold text-emerald-600">Rs. {(order.adminEarning || 0).toLocaleString()}</p>
                                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Net Profit</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border
                                                ${order.status.toLowerCase() === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    order.status.toLowerCase() === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button className="px-5 py-2.5 bg-white text-gray-500 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:text-orange-500 hover:border-orange-500 transition-all border border-gray-100 shadow-sm active:scale-95">
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
