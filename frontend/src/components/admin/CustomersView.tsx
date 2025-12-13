import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUser, FaSearch, FaFilter, FaEye, FaFlag, FaBan } from 'react-icons/fa';

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
            const res = await axios.get('http://localhost:5000/api/admin/users?role=customer', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomers(res.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
            // Fallback mock data for demo if API isn't ready
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: customers.length,
        active: customers.filter(c => (c.status === 'active' || !c.status)).length, // Default to active
        flagged: customers.filter(c => c.status === 'flagged').length,
        totalOrders: customers.reduce((acc, curr) => acc + (curr.totalOrders || 0), 0)
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone?.includes(searchTerm);
        return matchesSearch;
    });

    return (
        <div className="p-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Customers Management</h2>
                <p className="text-gray-500">Manage customers and monitor behavior</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Total Customers</p>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                            <FaUser />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Active Customers</p>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{stats.active}</h3>
                        <div className="bg-green-100 p-2 rounded-lg text-green-600">
                            <span className="font-bold">A</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Flagged</p>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{stats.flagged}</h3>
                        <div className="bg-red-100 p-2 rounded-lg text-red-600">
                            <FaFlag />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Total Orders</p>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{stats.totalOrders}</h3>
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <span className="font-bold">#</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
                <div className="relative flex-1 max-w-md">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-gray-600 bg-white"
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Flagged</option>
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
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Orders</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Total Spent</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Avg Order</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Cancellations</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Last Order</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer._id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{customer.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600">{customer.phone}</div>
                                        <div className="text-xs text-gray-400">{customer.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{customer.totalOrders || 0}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">Rs {(customer.totalSpent || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">Rs {(currentUserAvg(customer)).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {customer.cancellations > 0 ? (
                                            <span className="text-red-500 font-bold">{customer.cancellations}</span>
                                        ) : '0'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}
                                        <div className="text-xs text-gray-400">
                                            {customer.lastOrderDate ? formatTimeAgo(customer.lastOrderDate) : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${customer.status === 'flagged' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {customer.status === 'flagged' ? 'Flagged' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 text-gray-500">
                                            <button className="hover:text-orange-500"><FaEye /></button>
                                            <button className="hover:text-red-500"><FaBan /></button>
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
