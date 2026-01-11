'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaMapMarkerAlt, FaFileImage, FaEye, FaSearch, FaFilter, FaStar, FaStore, FaClock, FaExternalLinkAlt } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import { getSocket } from '../../utils/socket';
import { getImageUrl, getImageFallback } from '../../utils/imageUtils';

interface Restaurant {
    _id: string;
    name: string;
    owner: { _id: string; name: string; email: string; status: string };
    address: string;
    contact: string;
    logo: string;
    verificationStatus: string;
    isActive: boolean;
    rating: number;
    totalOrders: number;
    revenue: number;
    commissionRate: number;
    businessType: string;
    documents?: {
        logo?: string;
        cnicFront?: string;
        cnicBack?: string;
        businessLicense?: string;
    };
    bankDetails?: {
        accountType: string;
        accountHolderName: string;
        accountNumber: string;
        bankName: string;
        branchCode: string;
        iban: string;
        phoneNumber: string;
    };
}

export default function RestaurantsView() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'online' | 'offline'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

    useEffect(() => {
        fetchRestaurants();

        // Use global socket for real-time updates
        const socket = getSocket();
        
        if (socket) {
            const handleUpdate = () => {
                console.log('Restaurant update received in RestaurantsView, refreshing...');
                fetchRestaurants();
            };

            socket.on('restaurant_registered', handleUpdate);
            socket.on('restaurant_updated', handleUpdate);

            return () => {
                socket.off('restaurant_registered', handleUpdate);
                socket.off('restaurant_updated', handleUpdate);
            };
        }
    }, []);

    const fetchRestaurants = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;

            if (!token) return;

            const res = await axios.get(`${API_BASE_URL}/api/admin/restaurants`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            // Handle if data is wrapped in an object or is the array directly
            const restaurantList = Array.isArray(data) ? data : (Array.isArray(data.restaurants) ? data.restaurants : []);

            console.log('Fetched restaurants:', restaurantList);
            setRestaurants(restaurantList);
        } catch (error) {
            console.error('Error fetching restaurants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/restaurants/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
        } catch (error) {
            console.error('Error approving restaurant:', error);
        }
    };

    const handleReject = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/restaurants/${id}/reject`, { reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
        } catch (error) {
            console.error('Error rejecting restaurant:', error);
        }
    };

    const handleSuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!id) return alert('User ID not found');
        if (!window.confirm('Are you sure you want to suspend this user?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/suspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
            alert('User suspended successfully');
        } catch (error: any) {
            console.error('Error suspending user:', error);
            alert(error.response?.data?.message || 'Error suspending user');
        }
    };

    const handleUnsuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!id) return alert('User ID not found');
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/unsuspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
            alert('User unsuspended successfully');
        } catch (error: any) {
            console.error('Error unsuspending user:', error);
            alert(error.response?.data?.message || 'Error unsuspending user');
        }
    };

    const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!id) return alert('User ID not found');
        if (!window.confirm('WARNING: This will permanently delete the user and their restaurant. Proceed?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.delete(`${API_BASE_URL}/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
            alert('User deleted successfully');
        } catch (error: any) {
            console.error('Error deleting user:', error);
            alert(error.response?.data?.message || 'Error deleting user');
        }
    };

    const handleCleanupMock = async () => {
        if (!window.confirm('Are you sure you want to delete all mock restaurants and data? This cannot be undone.')) return;
        
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            await axios.post(`${API_BASE_URL}/api/admin/cleanup-mock`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            alert('Mock data cleanup successful! The list will refresh.');
            fetchRestaurants();
        } catch (error) {
            console.error('Cleanup failed:', error);
            alert('Cleanup failed. Please check console for details.');
        }
    };

    const stats = {
        total: restaurants?.length || 0,
        online: Array.isArray(restaurants) ? restaurants.filter(r => r.isActive && r.verificationStatus === 'approved').length : 0,
        pending: Array.isArray(restaurants) ? restaurants.filter(r => r.verificationStatus === 'pending').length : 0,
        commission: Array.isArray(restaurants) ? restaurants.reduce((acc, curr) => acc + (curr.revenue * 0.1), 0) : 0
    };

    const filteredRestaurants = Array.isArray(restaurants) ? restaurants.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.owner?.name.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = true;
        if (filter === 'pending') matchesFilter = r.verificationStatus === 'pending';
        if (filter === 'online') matchesFilter = r.isActive && r.verificationStatus === 'approved';
        if (filter === 'offline') matchesFilter = !r.isActive || r.verificationStatus !== 'approved';

        return matchesSearch && matchesFilter;
    }) : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Restaurants Management</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Manage all restaurants and their operations</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleCleanupMock}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shadow-md shadow-red-500/20 text-xs"
                    >
                        <FaTimesCircle /> Cleanup Mock
                    </button>
                    <button className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shadow-md shadow-orange-500/20 text-xs">
                        <FaStore /> + Add Restaurant
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Total Restaurants</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.total}</h3>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-lg text-blue-500">
                        <FaCheckCircle className="text-lg" />
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
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Pending Approval</p>
                        <h3 className="text-xl font-bold text-gray-800">{stats.pending}</h3>
                    </div>
                    <div className="bg-orange-50 p-2.5 rounded-lg text-orange-500">
                        <FaClock className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Total Commission</p>
                        <h3 className="text-xl font-bold text-gray-800">Rs. {stats.commission.toLocaleString()}</h3>
                    </div>
                    <div className="bg-purple-50 p-2.5 rounded-lg text-purple-500">
                        <span className="text-lg font-bold">Rs</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
                <div className="relative flex-1 max-w-lg">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                        type="text"
                        placeholder="Search by restaurant or owner name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="px-3 py-2 border border-gray-200 rounded-lg outline-none text-gray-600 bg-white text-xs"
                    >
                        <option value="all">All Status</option>
                        <option value="online">Online</option>
                        <option value="pending">Pending</option>
                        <option value="offline">Offline</option>
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
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Restaurant</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Orders</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Revenue</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Comm Rate</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payout</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRestaurants.map((restaurant) => (
                                <tr
                                    key={restaurant._id}
                                    className="hover:bg-gray-50 transition cursor-pointer"
                                    onClick={() => setSelectedRestaurant(restaurant)}
                                >
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            {restaurant.logo ? (
                                                <img src={getImageUrl(restaurant.logo)} alt={restaurant.name} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                                                    {restaurant.name?.charAt(0) || 'R'}
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <p className="font-bold text-gray-800 text-xs">{restaurant.name}</p>
                                                <p className="text-[10px] text-gray-500">{restaurant.contact}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="text-xs">
                                            <p className="font-medium text-gray-800">{restaurant.owner?.name}</p>
                                            <p className="text-[10px] text-gray-500">{restaurant.owner?.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        {restaurant.verificationStatus === 'pending' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> Pending
                                            </span>
                                        ) : restaurant.isActive && restaurant.verificationStatus === 'approved' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Online
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Offline
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                                            <FaStar className="text-yellow-400" />
                                            {restaurant.rating?.toFixed(1) || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-[11px] text-gray-600">{restaurant.totalOrders || 0}</td>
                                    <td className="px-6 py-3 text-[11px] text-gray-600">Rs. {(restaurant.revenue || 0).toLocaleString()}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${restaurant.businessType === 'home-chef' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {restaurant.businessType === 'home-chef' ? 'Home Chef' : 'Restaurant'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-[11px] font-semibold text-red-600">
                                        <div className="flex flex-col">
                                            <span>Rs. {(Math.round((restaurant.revenue || 0) * (restaurant.commissionRate / 100))).toLocaleString()}</span>
                                            <span className="text-[8px] text-gray-400 font-normal">{restaurant.commissionRate}% rate</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-[11px] font-bold text-green-600">
                                        Rs. {(Math.round((restaurant.revenue || 0) * (1 - restaurant.commissionRate / 100))).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {restaurant.verificationStatus === 'pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => handleApprove(restaurant._id, e)}
                                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                                    title="Approve"
                                                >
                                                    <FaCheckCircle />
                                                </button>
                                                <button
                                                    onClick={(e) => handleReject(restaurant._id, e)}
                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                    title="Reject"
                                                >
                                                    <FaTimesCircle />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                {restaurant.owner?.status === 'suspended' ? (
                                                    <button
                                                        onClick={(e) => handleUnsuspend(restaurant.owner?._id, e)}
                                                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                                        title="Unsuspend User"
                                                    >
                                                        <FaCheckCircle />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => handleSuspend(restaurant.owner?._id, e)}
                                                        className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200"
                                                        title="Suspend User"
                                                    >
                                                        <FaTimesCircle />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDeleteUser(restaurant.owner?._id, e)}
                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                    title="Delete User & Restaurant"
                                                >
                                                    <FaTimesCircle className="transform rotate-45" />
                                                </button>
                                                <button className="text-gray-400 hover:text-orange-500 p-2">
                                                    <FaEye />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Document Modal */}
            <AnimatePresence>
                {selectedRestaurant && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
                        onClick={() => setSelectedRestaurant(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{selectedRestaurant.name}</h3>
                                    <div className="text-[10px] text-gray-500 mt-1 flex gap-4 uppercase font-bold tracking-wider">
                                        <span>{selectedRestaurant.contact}</span>
                                        <span>•</span>
                                        <span>{selectedRestaurant.address}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedRestaurant(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <FaTimesCircle className="text-xl text-gray-400" />
                                </button>
                            </div>

                            {/* Document Grid */}
                            <div className="mb-8">
                                <h4 className="text-[10px] font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2 uppercase tracking-wider">Official Documents</h4>
                                {selectedRestaurant.documents ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(selectedRestaurant.documents).map(([key, value]) => (
                                            value && (
                                                <div key={key} className="group relative border border-gray-100 rounded-xl p-2 bg-gray-50/50 hover:border-orange-200 transition-colors">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2 tracking-tighter">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                    <div className="aspect-video relative overflow-hidden rounded-lg group">
                                                        <img 
                                                            src={getImageUrl(value as string)} 
                                                            alt={key} 
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src = getImageFallback('document');
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <a 
                                                                href={getImageUrl(value as string)} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="bg-white text-gray-900 px-3 py-1 rounded-full text-[10px] font-bold shadow-lg hover:bg-orange-500 hover:text-white transition-colors flex items-center gap-1"
                                                            >
                                                                <FaExternalLinkAlt size={8} /> View Full
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                                        <FaFileImage className="text-3xl mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-medium">No documents available</p>
                                    </div>
                                )}
                            </div>

                            {/* Bank Details Section */}
                            {selectedRestaurant.bankDetails && (
                                <div className="mt-6">
                                    <h4 className="text-[10px] font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2 uppercase tracking-wider">Settlement Information</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Account Type</p>
                                            <p className="text-xs font-bold text-gray-800 capitalize">{selectedRestaurant.bankDetails.accountType || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Account Holder</p>
                                            <p className="text-xs font-bold text-gray-800">{selectedRestaurant.bankDetails.accountHolderName || 'N/A'}</p>
                                        </div>
                                        {selectedRestaurant.bankDetails.accountType === 'bank' ? (
                                            <>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Bank Name</p>
                                                    <p className="text-xs font-bold text-gray-800">{selectedRestaurant.bankDetails.bankName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Account Number</p>
                                                    <p className="text-xs font-bold text-gray-800">{selectedRestaurant.bankDetails.accountNumber || 'N/A'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">IBAN</p>
                                                    <p className="text-xs font-bold text-gray-800">{selectedRestaurant.bankDetails.iban || 'N/A'}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div>
                                                <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Account Number / Phone</p>
                                                <p className="text-xs font-bold text-gray-800">{selectedRestaurant.bankDetails.accountNumber || selectedRestaurant.bankDetails.phoneNumber || 'N/A'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons for Pending */}
                            {selectedRestaurant.verificationStatus === 'pending' && (
                                <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
                                    <button
                                        onClick={(e) => handleApprove(selectedRestaurant._id, e)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all active:scale-[0.98] text-sm"
                                    >
                                        <FaCheckCircle /> Approve Restaurant
                                    </button>
                                    <button
                                        onClick={(e) => handleReject(selectedRestaurant._id, e)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-6 py-3 rounded-xl font-bold transition-all active:scale-[0.98] text-sm"
                                    >
                                        <FaTimesCircle /> Reject Application
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
