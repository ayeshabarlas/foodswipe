'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaUser, FaMotorcycle, FaSearch, FaFilter, FaMapMarkerAlt, FaStar, FaEye, FaPlus, FaCheckCircle, FaBan, FaTrash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface Rider {
    _id: string;
    user: { _id: string; name: string; email: string; phone: string; status: string; createdAt: string };
    vehicleType: string;
    vehicleNumber: string;
    status: string;
    isOnline: boolean;
    totalOrders: number;
    todayOrders: number;
    totalEarnings: number;
    cashCollected: number;
    stats: { rating: number; successRate?: number };
    documents?: {
        cnicFront?: string;
        cnicBack?: string;
        drivingLicense?: string;
    };
    wallet?: {
        pendingWithdraw?: number;
        bonuses?: number;
    };
}

export default function RidersView() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRider, setSelectedRider] = useState<Rider | null>(null);

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
            
            // Update selected rider if we're in detail view
            if (selectedRider) {
                const updated = ridersList.find((r: Rider) => r._id === selectedRider._id);
                if (updated) setSelectedRider(updated);
            }
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
            if (selectedRider?.user?._id === id) setSelectedRider(null);
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

    if (selectedRider) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <button 
                    onClick={() => setSelectedRider(null)}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition"
                >
                    ← Back to Riders
                </button>

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedRider.user?.name}</h2>
                        <p className="text-gray-500">Rider profile and performance analytics</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition">
                            Edit Profile
                        </button>
                        <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition">
                            Track Live
                        </button>
                    </div>
                </div>

                {/* Status Banner */}
                <div className={`w-full p-4 rounded-2xl mb-8 flex items-center justify-between ${
                    selectedRider.isOnline ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                }`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <FaMotorcycle className="text-2xl" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{selectedRider.user?.name}</span>
                                <span className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                    <div className={`w-2 h-2 rounded-full ${selectedRider.isOnline ? 'bg-white animate-pulse' : 'bg-gray-200'}`}></div>
                                    {selectedRider.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                            <p className="text-sm opacity-90">
                                {selectedRider.isOnline ? 'Currently active on duty' : 'Currently off duty'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                            <FaStar className="text-yellow-300" />
                            <span className="font-bold text-lg">{selectedRider.stats?.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <p className="text-xs opacity-80">{selectedRider.totalOrders || 0} reviews</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Personal Info */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-6">Personal Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Phone</label>
                                <p className="font-medium text-gray-800">{selectedRider.user?.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Email</label>
                                <p className="font-medium text-gray-800">{selectedRider.user?.email || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">CNIC</label>
                                <p className="font-medium text-gray-800">{selectedRider.documents?.cnicFront ? 'Verified' : 'Pending'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-6">Vehicle Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Vehicle Type</label>
                                <p className="font-medium text-gray-800 capitalize">{selectedRider.vehicleType || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">License Number</label>
                                <p className="font-medium text-gray-800">{selectedRider.vehicleNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Join Date</label>
                                <p className="font-medium text-gray-800">
                                    {selectedRider.user?.createdAt ? new Date(selectedRider.user.createdAt).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Info */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-6">Performance Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Today</span>
                                <span className="font-bold text-gray-800">{selectedRider.todayOrders} orders</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">This Week</span>
                                <span className="font-bold text-gray-800">{(selectedRider.todayOrders * 5)} orders</span> {/* Mock weekly */}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Total</span>
                                <span className="font-bold text-gray-800">{selectedRider.totalOrders || 0} orders</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                <span className="text-gray-500">Success Rate</span>
                                <span className="font-bold text-green-600">{selectedRider.stats?.successRate || 98.5}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wallet Section */}
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-8 text-white">
                    <div className="flex justify-between items-start mb-12">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <FaMapMarkerAlt className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Rider Wallet</h3>
                                <p className="text-white/70 text-sm">Earnings and cash management</p>
                            </div>
                        </div>
                        <button className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-bold hover:bg-gray-100 transition shadow-xl">
                            Process Withdrawal
                        </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <p className="text-white/60 text-sm mb-1">Total Earnings</p>
                            <p className="text-2xl font-bold">Rs {(selectedRider.totalEarnings || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-white/60 text-sm mb-1">Cash Collected (COD)</p>
                            <p className="text-2xl font-bold">Rs {(selectedRider.cashCollected || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-white/60 text-sm mb-1">Pending Withdraw</p>
                            <p className="text-2xl font-bold">Rs {(selectedRider.wallet?.pendingWithdraw || 45000).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-white/60 text-sm mb-1">Bonuses</p>
                            <p className="text-2xl font-bold">Rs {(selectedRider.wallet?.bonuses || 5000).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Riders Management</h2>
                    <p className="text-gray-500">Manage delivery riders and their performance</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/30">
                    <FaPlus /> Add Rider
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Total Riders</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                        <FaMapMarkerAlt className="text-xl" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Online Now</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.online}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Deliveries Today</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.deliveriesToday}</h3>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
                        <FaStar className="text-xl" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Cash Collected</p>
                        <h3 className="text-2xl font-bold text-gray-800">Rs {stats.cashCollected.toLocaleString()}</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                        <span className="font-bold text-xl">Rs</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between">
                <div className="relative flex-1 max-w-md">
                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by rider name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-sm"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-6 py-3 border border-gray-100 rounded-2xl outline-none text-gray-600 bg-white shadow-sm font-medium"
                    >
                        <option value="All">All Status</option>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                    </select>
                    <button className="flex items-center gap-2 px-6 py-3 border border-gray-100 bg-white rounded-2xl hover:bg-gray-50 text-gray-600 shadow-sm font-medium">
                        <FaFilter /> More Filters
                    </button>
                    <button className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30">
                        <FaMapMarkerAlt /> Live Map
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Rider</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Rating</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Today</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Total Orders</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Total Earnings</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cash Collected</th>
                            <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredRiders.map((rider) => (
                            <tr key={rider._id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-8 py-5">
                                    <div>
                                        <p className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors">{rider.user?.name || 'Unknown User'}</p>
                                        <p className="text-xs text-gray-400">{rider.user?.phone || 'No Phone'}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="text-sm font-medium text-gray-600 capitalize">{rider.vehicleType}</span>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold w-fit ${
                                        rider.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${rider.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                        {rider.isOnline ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-1 text-sm font-bold text-gray-700">
                                        <FaStar className="text-yellow-400" />
                                        {rider.stats?.rating?.toFixed(1) || 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-500 font-medium">{rider.todayOrders} orders</td>
                                <td className="px-6 py-5 text-sm text-gray-500 font-medium">{rider.totalOrders || 0}</td>
                                <td className="px-6 py-5 text-sm font-bold text-gray-800">
                                    Rs {(rider.totalEarnings || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-5 text-sm font-bold text-orange-600">
                                    Rs {(rider.cashCollected || 0).toLocaleString()}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        {rider.user?.status === 'suspended' ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUnsuspend(rider.user?._id); }}
                                                className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                                                title="Unsuspend"
                                            >
                                                <FaCheckCircle />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSuspend(rider.user?._id); }}
                                                className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition-colors"
                                                title="Suspend"
                                            >
                                                <FaBan />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(rider.user?._id); }}
                                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                        <button 
                                            onClick={() => setSelectedRider(rider)}
                                            className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors"
                                            title="View Details"
                                        >
                                            <FaEye />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRiders.length === 0 && (
                    <div className="py-20 text-center text-gray-400">
                        <FaMotorcycle className="text-5xl mx-auto mb-4 opacity-10" />
                        <p className="font-medium">No riders found matching your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
}
