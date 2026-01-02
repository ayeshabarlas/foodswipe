'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
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
}

export default function EnhancedOrdersView() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchOrders();

        const socket = io(SOCKET_URL);
        
        const handleUpdate = () => {
            if (autoRefresh) {
                console.log('Real-time update: Refreshing enhanced orders...');
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
            // Fetch all orders
            const res = await axios.get(`${API_BASE_URL}/api/admin/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(Array.isArray(res.data) ? res.data : (res.data?.orders || []));
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        totalOrders: orders?.length || 0,
        totalRevenue: Array.isArray(orders) ? orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) : 0,
        commission: Array.isArray(orders) ? orders.reduce((acc, curr) => acc + Math.round((curr.totalAmount || 0) * 0.1), 0) : 0,
        avgOrderValue: (Array.isArray(orders) && orders.length > 0) ? Math.round(orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) / orders.length) : 0
    };

    const filteredOrders = Array.isArray(orders) ? orders.filter(o => {
        const term = searchTerm.toLowerCase();
        return (o._id && o._id.toLowerCase().includes(term)) ||
            (o.user?.name && o.user.name.toLowerCase().includes(term)) ||
            (o.restaurant?.name && o.restaurant.name.toLowerCase().includes(term));
    }) : [];

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">All Orders</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Complete order history and management</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-100 rounded-lg bg-white text-gray-500 text-xs font-bold uppercase tracking-wider hover:bg-gray-50">
                        <FaCalendarAlt /> Date Range
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-green-600 shadow-sm">
                        <FaDownload /> Export
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-[10px] mb-1 font-bold uppercase tracking-wider">Total Orders</p>
                    <h3 className="text-lg font-bold text-gray-800">{stats.totalOrders}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-[10px] mb-1 font-bold uppercase tracking-wider">Total Revenue</p>
                    <h3 className="text-lg font-bold text-gray-800">Rs {stats.totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-[10px] mb-1 font-bold uppercase tracking-wider">Platform Commission</p>
                    <h3 className="text-lg font-bold text-gray-800">Rs {stats.commission.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-[10px] mb-1 font-bold uppercase tracking-wider">Avg Order Value</p>
                    <h3 className="text-lg font-bold text-gray-800">Rs {stats.avgOrderValue.toLocaleString()}</h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                        type="text"
                        placeholder="Search by ID, customer or restaurant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-100">
                        <FaFilter className="text-xs" />
                    </button>
                    <button
                        onClick={() => fetchOrders()}
                        disabled={loading}
                        className={`p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <FaSyncAlt className="text-xs" />
                    </button>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Auto Refresh</span>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${autoRefresh ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${autoRefresh ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Info</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Restaurant</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-4 py-4 h-16 bg-gray-50/20"></td>
                                    </tr>
                                ))
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-xs">No orders found matching your search.</td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                                                    <FaReceipt className="text-xs" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800">#{order.orderNumber || order._id.slice(-6)}</p>
                                                    <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-bold text-gray-800">{order.user?.name || 'Guest'}</p>
                                            <p className="text-[10px] text-gray-400">Customer</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-bold text-gray-800">{order.restaurant?.name || 'Restaurant'}</p>
                                            <p className="text-[10px] text-gray-400">Partner</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-bold text-gray-800">Rs {order.totalAmount?.toLocaleString()}</p>
                                            <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Paid</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest
                                                ${order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                                                    order.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                                                        'bg-blue-50 text-blue-600'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="px-3 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-gray-100 transition-all border border-gray-100">
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
