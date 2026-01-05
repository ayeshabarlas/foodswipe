'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaUser, FaSearch, FaFilter, FaEye, FaFlag, FaBan, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface Customer {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status?: string;
    createdAt: string;
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    cancellations: number;
    lastOrderDate: string;
}

export default function CustomersView() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            // Assuming we have an endpoint for this, if not we might need to use existing users endpoint and aggregate on client or server
            // Using a hypothetical endpoint that returns aggregated customer stats
            const res = await axios.get(`${API_BASE_URL}/api/admin/users?role=customer`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomers(Array.isArray(res.data) ? res.data : (res.data?.users || []));
        } catch (error) {
            console.error('Error fetching customers:', error);
            // Fallback mock data for demo if API isn't ready
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to suspend this customer?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/suspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCustomers();
        } catch (error) {
            console.error('Error suspending customer:', error);
        }
    };

    const handleUnsuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/unsuspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCustomers();
        } catch (error) {
            console.error('Error unsuspending customer:', error);
        }
    };

    const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('WARNING: This will permanently delete the customer account. Proceed?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.delete(`${API_BASE_URL}/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
        }
    };

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('user_registered', () => {
            console.log('New user registered, refreshing...');
            fetchCustomers();
        });
        return () => {
            socket.disconnect();
        };
    }, []);

    const stats = {
        total: customers?.length || 0,
        active: Array.isArray(customers) ? customers.filter(c => (c.status === 'active' || !c.status)).length : 0, // Default to active
        flagged: Array.isArray(customers) ? customers.filter(c => c.status === 'flagged').length : 0,
        totalOrders: Array.isArray(customers) ? customers.reduce((acc, curr) => acc + (curr.totalOrders || 0), 0) : 0
    };

    const filteredCustomers = Array.isArray(customers) ? customers.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone?.includes(searchTerm);
        return matchesSearch;
    }) : [];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Customers Management</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Manage customers and monitor behavior</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Total Customers</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.total}</h3>
                    </div>
                    <div className="bg-orange-50 p-2.5 rounded-lg text-orange-500">
                        <FaUser className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Active Customers</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.active}</h3>
                    </div>
                    <div className="bg-green-50 p-2.5 rounded-lg text-green-500 text-sm font-bold">
                        ACT
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Flagged</p>
                        <h3 className="text-xl font-bold text-red-600">{stats.flagged}</h3>
                    </div>
                    <div className="bg-red-50 p-2.5 rounded-lg text-red-500">
                        <FaFlag className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Total Orders</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.totalOrders}</h3>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-lg text-blue-500 text-sm font-bold">
                        ORD
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
                <div className="relative flex-1 max-w-lg">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-3 py-2 border border-gray-200 rounded-lg outline-none text-gray-600 bg-white text-xs font-bold uppercase"
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Flagged</option>
                    </select>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-xs">
                        <FaFilter /> Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Orders</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Spent</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg Order</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cancellations</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Order</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer._id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-3">
                                        <div className="text-xs font-bold text-gray-800">{customer.name}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="text-[11px] text-gray-600">{customer.phone}</div>
                                        <div className="text-[10px] text-gray-400">{customer.email}</div>
                                    </td>
                                    <td className="px-6 py-3 text-[11px] text-gray-600">{customer.totalOrders || 0}</td>
                                    <td className="px-6 py-3 text-[11px] font-bold text-gray-800">Rs. {(customer.totalSpent || 0).toLocaleString()}</td>
                                    <td className="px-6 py-3 text-[11px] text-gray-600">Rs. {(currentUserAvg(customer)).toLocaleString()}</td>
                                    <td className="px-6 py-3 text-[11px] text-gray-600">
                                        {customer.cancellations > 0 ? (
                                            <span className="text-red-500 font-bold">{customer.cancellations}</span>
                                        ) : '0'}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="text-[11px] text-gray-600">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}</div>
                                        <div className="text-[10px] text-gray-400">
                                            {customer.lastOrderDate ? formatTimeAgo(customer.lastOrderDate) : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${customer.status === 'flagged' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {customer.status === 'flagged' ? 'Flagged' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-1.5 text-gray-500">
                                            {customer.status === 'suspended' ? (
                                                <button
                                                    onClick={(e) => handleUnsuspend(customer._id, e)}
                                                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                                    title="Unsuspend"
                                                >
                                                    <FaCheckCircle className="text-xs" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleSuspend(customer._id, e)}
                                                    className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100"
                                                    title="Suspend"
                                                >
                                                    <FaBan className="text-xs" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDeleteUser(customer._id, e)}
                                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                                title="Delete"
                                            >
                                                <FaTimesCircle className="text-xs" />
                                            </button>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition"><FaEye className="text-xs" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    function currentUserAvg(c: any) {
        if (!c.totalOrders || c.totalOrders === 0) return 0;
        return Math.round(c.totalSpent / c.totalOrders);
    }

    function formatTimeAgo(dateString: string) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return `${Math.floor(diff / 86400)} days ago`;
    }
}
