'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaUser, FaMotorcycle, FaSearch, FaFilter, FaMapMarkerAlt, FaStar, FaEye, FaPlus, FaCheckCircle, FaBan, FaTrash, FaDollarSign } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface Rider {
    _id: string;
    fullName: string;
    user: { _id: string; name: string; email: string; phone: string; status: string; createdAt: string };
    vehicleType: string;
    vehicleNumber: string;
    status: string;
    isOnline: boolean;
    earnings: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        total: number;
    };
    cashCollected: number;
    totalEarnings?: number;
    availableWithdraw?: number;
    totalOrders?: number;
    todayOrders?: number;
    stats: { 
        rating: number; 
        successRate?: number;
        totalDeliveries: number;
        completedDeliveries: number;
    };
    documents?: {
        cnicFront?: string;
        cnicBack?: string;
        drivingLicense?: string;
        vehicleRegistration?: string;
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
            (rider.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rider.user?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rider.user?.phone || '').includes(searchTerm);
        const matchesFilter = filter === 'All' ||
            (filter === 'Online' && rider.isOnline) ||
            (filter === 'Offline' && !rider.isOnline);
        return matchesSearch && matchesFilter;
    }) : [];

    if (selectedRider) {
        return (
            <div className="p-4 bg-gray-50 min-h-screen">
                <button 
                    onClick={() => setSelectedRider(null)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 mb-4 transition text-[10px] font-bold uppercase tracking-wider"
                >
                    ← Back to Riders
                </button>

                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{selectedRider.fullName || selectedRider.user?.name}</h2>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Rider Profile & Performance</p>
                    </div>
                    <div className="flex gap-1.5">
                        <button className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition text-[10px] uppercase">
                            Edit Profile
                        </button>
                        <button className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition text-[10px] uppercase">
                            Track Live
                        </button>
                    </div>
                </div>

                {/* Status Banner */}
                <div className={`w-full p-3 rounded-xl mb-4 flex items-center justify-between ${
                    selectedRider.isOnline ? 'bg-green-500 text-white shadow-md shadow-green-500/10' : 'bg-gray-400 text-white shadow-md shadow-gray-400/10'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <FaMotorcycle className="text-base" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{selectedRider.fullName || selectedRider.user?.name}</span>
                                <span className="flex items-center gap-1 text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                    <div className={`w-1 h-1 rounded-full ${selectedRider.isOnline ? 'bg-white animate-pulse' : 'bg-gray-200'}`}></div>
                                    {selectedRider.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                            <p className="text-[9px] opacity-80 font-bold uppercase tracking-wider">
                                {selectedRider.isOnline ? 'Active on duty' : 'Off duty'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                            <FaStar className="text-yellow-300 text-[10px]" />
                            <span className="font-bold text-sm">{selectedRider.stats?.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <p className="text-[9px] opacity-70 font-bold uppercase tracking-wider">{selectedRider.totalOrders || 0} DELIVERIES</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    {/* Personal Info */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-[10px] font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                            <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
                            Personal Info
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">Phone</label>
                                <p className="text-xs font-bold text-gray-700">{selectedRider.user?.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">Email</label>
                                <p className="text-xs font-bold text-gray-700 truncate">{selectedRider.user?.email || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">Status</label>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${
                                    selectedRider.user?.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                    {selectedRider.user?.status || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-[10px] font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                            <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                            Vehicle Details
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">Vehicle Type</label>
                                <p className="text-xs font-bold text-gray-700 capitalize">{selectedRider.vehicleType || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">Plate Number</label>
                                <p className="text-xs font-bold text-gray-700 uppercase">{selectedRider.vehicleNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">Member Since</label>
                                <p className="text-xs font-bold text-gray-700">
                                    {selectedRider.user?.createdAt ? new Date(selectedRider.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Info */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-[10px] font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                            <div className="w-1 h-3 bg-purple-500 rounded-full"></div>
                            Performance
                        </h3>
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Today</span>
                                <span className="font-bold text-gray-800 text-xs">{selectedRider.todayOrders || 0} orders</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">This Week</span>
                                <span className="font-bold text-gray-800 text-xs">{selectedRider.earnings?.thisWeek || 0} orders</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Total Orders</span>
                                <span className="font-bold text-gray-800 text-xs">{selectedRider.totalOrders || 0} orders</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Success Rate</span>
                                <span className="font-bold text-green-600 text-xs">{selectedRider.stats?.successRate || 100}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wallet Section */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex gap-2.5">
                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                                <FaDollarSign className="text-sm text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold">Rider Wallet</h3>
                                <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Earnings & Cash Balance</p>
                            </div>
                        </div>
                        <button className="bg-white text-gray-900 px-2.5 py-1 rounded-lg font-bold hover:bg-gray-100 transition shadow-sm text-[9px] uppercase tracking-wider">
                            Process Payout
                        </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                            <p className="text-white/40 text-[8px] font-bold uppercase tracking-wider mb-0.5">Total Earnings</p>
                            <p className="text-sm font-bold text-green-400">Rs. {(selectedRider.totalEarnings || selectedRider.earnings?.total || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                            <p className="text-white/40 text-[8px] font-bold uppercase tracking-wider mb-0.5">Cash (COD)</p>
                            <p className="text-sm font-bold text-orange-400">Rs. {(selectedRider.cashCollected || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                            <p className="text-white/40 text-[8px] font-bold uppercase tracking-wider mb-0.5">Available Withdraw</p>
                            <p className="text-sm font-bold text-blue-400">Rs. {(selectedRider.availableWithdraw || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                            <p className="text-white/40 text-[8px] font-bold uppercase tracking-wider mb-0.5">Avg Rating</p>
                            <p className="text-sm font-bold text-yellow-400 flex items-center gap-1.5">
                                <FaStar className="text-[10px]" /> {selectedRider.stats?.rating?.toFixed(1) || '0.0'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Riders Management</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Monitor and manage delivery partners</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shadow-md shadow-blue-500/20 text-xs">
                        <FaMapMarkerAlt /> Live Map
                    </button>
                    <button className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shadow-md shadow-orange-500/20 text-xs">
                        <FaPlus /> Add Rider
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Total Riders</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.total}</h3>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-lg text-blue-500">
                        <FaUser className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Online Now</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.online}</h3>
                    </div>
                    <div className="bg-green-50 p-2.5 rounded-lg text-green-500">
                        <FaCheckCircle className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Deliveries Today</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.deliveriesToday}</h3>
                    </div>
                    <div className="bg-purple-50 p-2.5 rounded-lg text-purple-500">
                        <FaMotorcycle className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Cash Collected</p>
                        <h3 className="text-xl font-bold text-gray-800">Rs. {stats.cashCollected.toLocaleString()}</h3>
                    </div>
                    <div className="bg-orange-50 p-2.5 rounded-lg text-orange-500">
                        <FaDollarSign className="text-lg" />
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
                <div className="relative flex-1 max-w-lg">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                        type="text"
                        placeholder="Search by rider name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg outline-none text-gray-600 bg-white text-xs"
                    >
                        <option value="All">All Status</option>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
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
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rider</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Today</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Orders</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Earnings</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cash</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRiders.map((rider) => (
                                <tr key={rider._id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedRider(rider)}>
                                    <td className="px-6 py-3">
                                        <div className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-800">{rider.fullName || rider.user?.name || 'Unknown User'}</p>
                                                <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">FIXED</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500">{rider.user?.phone || 'No Phone'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-[10px] font-medium text-gray-600 capitalize">{rider.vehicleType}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            rider.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${rider.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                            {rider.isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-700">
                                            <FaStar className="text-yellow-400" />
                                            {rider.stats?.rating?.toFixed(1) || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-[10px] text-gray-600">{rider.todayOrders || 0}</td>
                                    <td className="px-6 py-3 text-[10px] text-gray-600">{rider.totalOrders || 0}</td>
                                    <td className="px-6 py-3 text-[10px] font-bold text-gray-800">
                                                Rs. {(rider.totalEarnings || rider.earnings?.total || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3 text-[10px] font-bold text-orange-600">
                                                Rs. {(rider.cashCollected || 0).toLocaleString()}
                                            </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {rider.user?.status === 'suspended' ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnsuspend(rider.user?._id); }}
                                                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                    title="Unsuspend"
                                                >
                                                    <FaCheckCircle className="text-xs" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSuspend(rider.user?._id); }}
                                                    className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                                                    title="Suspend"
                                                >
                                                    <FaBan className="text-xs" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(rider.user?._id); }}
                                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Delete"
                                            >
                                                <FaTrash className="text-xs" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredRiders.length === 0 && (
                    <div className="py-12 text-center text-gray-400">
                        <FaMotorcycle className="text-4xl mx-auto mb-3 opacity-10" />
                        <p className="text-sm font-medium">No riders found matching your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
}
