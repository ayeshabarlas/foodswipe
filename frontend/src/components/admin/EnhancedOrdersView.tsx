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
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">All Orders</h2>
                    <p className="text-gray-500">Complete order history and management</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50">
                        <FaCalendarAlt /> Date Range
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-md">
                        <FaDownload /> Export
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Total Orders</p>
                    <h3 className="text-2xl font-bold text-gray-800">{stats.totalOrders}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-800">Rs {stats.totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-green-600 text-sm mb-1 font-medium">Platform Commission</p>
                    <h3 className="text-2xl font-bold text-green-700">Rs {stats.commission.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Average Order Value</p>
                    <h3 className="text-2xl font-bold text-gray-800">Rs {stats.avgOrderValue.toLocaleString()}</h3>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-lg">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by order ID, customer, or restaurant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <div className="flex gap-3">
                    <select className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white text-gray-600">
                        <option>All Status</option>
                        <option>Delivered</option>
                        <option>Cancelled</option>
                    </select>
                    <select className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white text-gray-600">
                        <option>All Payments</option>
                        <option>Cash</option>
                        <option>Card</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                        <FaFilter /> More Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Order ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Time</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Restaurant</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Rider</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Items</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Subtotal</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Commission (10%)</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.map(order => (
                                <tr key={order._id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                        #{order.orderNumber || order._id.slice(-6)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                                        {order.user?.name || 'Guest'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {order.restaurant?.name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {order.rider?.user?.name || 'Unassigned'}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                                        {order.items?.length || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                                        Rs {Math.round(order.totalAmount * 0.9).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                                        Rs {Math.round(order.totalAmount * 0.1).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                                        Rs {(order.totalAmount || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
