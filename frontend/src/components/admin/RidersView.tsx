'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaUser, FaMotorcycle, FaSearch, FaFilter, FaMapMarkerAlt, FaStar, FaEye } from 'react-icons/fa';

interface Rider {
    _id: string;
    user: { _id: string; name: string; email: string; phone: string; status: string };
    vehicleType: string;
    vehicleNumber: string;
    status: string;
    isOnline: boolean;
    totalOrders: number;
    todayOrders: number;
    totalEarnings: number;
    cashCollected: number;
    stats: { rating: number };
}

export default function RidersView() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRiders();

        const socket = io(SOCKET_URL);
        socket.on('rider_updated', () => {
            console.log('Rider status updated, refreshing...');
            fetchRiders();
        });
        socket.on('order_updated', () => {
            console.log('Order status updated (rider may be affected), refreshing...');
            fetchRiders();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchRiders = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get(`${API_BASE_URL}/api/admin/riders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            const ridersList = Array.isArray(data) ? data : (Array.isArray(data.riders) ? data.riders : []);
            setRiders(ridersList);
        } catch (error) {
            console.error('Error fetching riders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async (id: string) => {
        if (!window.confirm('Are you sure you want to suspend this rider?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/suspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRiders();
        } catch (error) {
            console.error('Error suspending rider:', error);
        }
    };

    const handleUnsuspend = async (id: string) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/unsuspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRiders();
        } catch (error) {
            console.error('Error unsuspending rider:', error);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('WARNING: This will permanently delete the rider account and profile. Proceed?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.delete(`${API_BASE_URL}/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRiders();
        } catch (error) {
            console.error('Error deleting rider:', error);
        }
    };

    const stats = {
        total: riders?.length || 0,
        online: Array.isArray(riders) ? riders.filter(r => r.isOnline).length : 0,
        deliveriesToday: Array.isArray(riders) ? riders.reduce((acc, curr) => acc + (curr.todayOrders || 0), 0) : 0,
        cashCollected: Array.isArray(riders) ? riders.reduce((acc, curr) => acc + (curr.cashCollected || 0), 0) : 0
    };

    const filteredRiders = Array.isArray(riders) ? riders.filter(rider => {
        const matchesSearch =
            (rider.user?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rider.user?.phone || '').includes(searchTerm);
        const matchesFilter = filter === 'All' ||
            (filter === 'Online' && rider.isOnline) ||
            (filter === 'Offline' && !rider.isOnline);
        return matchesSearch && matchesFilter;
    }) : [];

    return (
        <div className="p-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Riders Management</h2>
                <p className="text-gray-500">Manage delivery riders and their performance</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Total Riders</p>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <FaMotorcycle />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Online Now</p>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{stats.online}</h3>
                        <div className="bg-green-100 p-2 rounded-lg text-green-600">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Deliveries Today</p>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{stats.deliveriesToday}</h3>
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                            <FaStar />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Cash Collected</p>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">Rs {stats.cashCollected.toLocaleString()}</h3>
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                            <span className="font-bold">$</span>
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
                        placeholder="Search by rider name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-gray-600 bg-white"
                    >
                        <option value="All">All Status</option>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                        <FaFilter /> More Filters
                    </button>
                    <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/30">
                        Live Map
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Rider</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Vehicle</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Rating</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Today</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Total Orders</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Total Earnings</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Cash Collected</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRiders.map((rider) => (
                            <tr key={rider._id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-bold text-gray-800">{rider.user?.name || 'Unknown User'}</p>
                                        <p className="text-xs text-gray-500">{rider.user?.phone || 'No Phone'}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{rider.vehicleType}</td>
                                <td className="px-6 py-4">
                                    <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold w-fit ${rider.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${rider.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        {rider.isOnline ? 'Online' : 'Offline'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                                        <FaStar className="text-yellow-400" />
                                        {rider.stats?.rating?.toFixed(1) || 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{rider.todayOrders} orders</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{rider.totalOrders || 0}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                                    Rs {(rider.totalEarnings || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-orange-600">
                                    Rs {(rider.cashCollected || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {rider.user?.status === 'suspended' ? (
                                            <button
                                                onClick={() => handleUnsuspend(rider.user?._id)}
                                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                                title="Unsuspend"
                                            >
                                                <FaSearch className="transform rotate-90" /> {/* Placeholder for Resume/Unsuspend icon if not imported */}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSuspend(rider.user?._id)}
                                                className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200"
                                                title="Suspend"
                                            >
                                                <FaFilter /> {/* Placeholder for Suspend icon if not imported */}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteUser(rider.user?._id)}
                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                            title="Delete"
                                        >
                                            <FaMotorcycle className="transform rotate-45" /> {/* Placeholder for Delete icon if not imported */}
                                        </button>
                                        <button className="text-orange-500 hover:text-orange-600 p-2">
                                            <FaEye />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRiders.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                        <p className="mb-4">No riders found matching your criteria</p>
                        <p className="text-sm">
                            Tip: If you've just signed up as a rider, check the
                            <span className="text-orange-500 font-bold ml-1 cursor-pointer hover:underline">
                                Approvals
                            </span> section.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
