'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaCheckCircle, FaTimesCircle, FaMapMarkerAlt, FaFileImage, 
    FaEye, FaSearch, FaFilter, FaStar, FaStore, FaClock, 
    FaExternalLinkAlt, FaPhone, FaEnvelope, FaUser, FaBuilding,
    FaMoneyBillWave, FaPercentage, FaWallet, FaHistory
} from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import { getSocket } from '../../utils/socket';
import { getImageUrl, getImageFallback } from '../../utils/imageUtils';
import toast from 'react-hot-toast';

interface Restaurant {
    _id: string;
    name: string;
    owner: { _id: string; name: string; email: string; status: string };
    address: string;
    contact: string;
    logo: string;
    verificationStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
    isActive: boolean;
    rating: number;
    totalOrders: number;
    revenue: number;
    commission: number;
    commissionRate: number;
    businessType: 'home-chef' | 'restaurant';
    createdAt: string;
    ownerCNIC?: string;
    cuisineTypes?: string[];
    documents?: {
        logo?: string;
        cnicFront?: string;
        cnicBack?: string;
        license?: string;
        menu?: string;
    };
    bankDetails?: {
        accountType: 'bank' | 'jazzcash' | 'easypaisa';
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

    const formatTimeAgo = (date: string) => {
        if (!date) return 'N/A';
        const now = new Date();
        const then = new Date(date);
        const diffInMs = now.getTime() - then.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 30) return `${diffInDays} days ago`;
        return then.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    useEffect(() => {
        fetchRestaurants();

        const socket = getSocket();
        if (socket) {
            const handleUpdate = () => {
                console.log('Restaurant update received, refreshing...');
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
            const restaurantList = Array.isArray(data) ? data : (Array.isArray(data.restaurants) ? data.restaurants : []);
            setRestaurants(restaurantList);
        } catch (error) {
            console.error('Error fetching restaurants:', error);
            toast.error('Failed to fetch restaurants');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Approve this restaurant?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/restaurants/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Restaurant approved');
            fetchRestaurants();
            if (selectedRestaurant?._id === id) {
                setSelectedRestaurant(prev => prev ? { ...prev, verificationStatus: 'approved', isActive: true } : null);
            }
        } catch (error) {
            console.error('Error approving restaurant:', error);
            toast.error('Failed to approve restaurant');
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
            toast.success('Restaurant application rejected');
            fetchRestaurants();
            if (selectedRestaurant?._id === id) {
                setSelectedRestaurant(prev => prev ? { ...prev, verificationStatus: 'rejected' } : null);
            }
        } catch (error) {
            console.error('Error rejecting restaurant:', error);
            toast.error('Failed to reject restaurant');
        }
    };

    const handleSuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!id) return;
        if (!window.confirm('Suspend this user and their restaurant?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/suspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('User suspended');
            fetchRestaurants();
        } catch (error: any) {
            console.error('Error suspending user:', error);
            toast.error(error.response?.data?.message || 'Error suspending user');
        }
    };

    const handleUnsuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!id) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/unsuspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('User unsuspended');
            fetchRestaurants();
        } catch (error: any) {
            console.error('Error unsuspending user:', error);
            toast.error(error.response?.data?.message || 'Error unsuspending user');
        }
    };

    const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!id) return;
        if (!window.confirm('DANGER: Permanently delete this user and their restaurant?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.delete(`${API_BASE_URL}/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('User deleted');
            fetchRestaurants();
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error(error.response?.data?.message || 'Error deleting user');
        }
    };

    const stats = {
        total: restaurants?.length || 0,
        online: restaurants.filter(r => r.isActive && r.verificationStatus === 'approved').length,
        pending: restaurants.filter(r => r.verificationStatus === 'pending').length,
        commission: restaurants.reduce((acc, curr) => acc + (curr.commission || 0), 0)
    };

    const filteredRestaurants = restaurants.filter(r => {
        const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.owner?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = true;
        if (filter === 'pending') matchesFilter = r.verificationStatus === 'pending';
        if (filter === 'online') matchesFilter = r.isActive && r.verificationStatus === 'approved';
        if (filter === 'offline') matchesFilter = !r.isActive || r.verificationStatus !== 'approved';

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Restaurants</h2>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Vendor & Storefront Management</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2 text-[14px] active:scale-95">
                        <FaStore /> Add New Partner
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Total Partners', value: stats.total, icon: FaStore, color: 'blue', gradient: 'from-blue-500 to-indigo-600' },
                    { label: 'Active Stores', value: stats.online, icon: FaCheckCircle, color: 'green', gradient: 'from-emerald-500 to-teal-600' },
                    { label: 'Pending Review', value: stats.pending, icon: FaClock, color: 'orange', gradient: 'from-amber-500 to-orange-600' },
                    { label: 'Total Commission', value: `Rs. ${stats.commission.toLocaleString()}`, icon: FaMoneyBillWave, color: 'brand', gradient: 'from-orange-500 to-pink-500' }
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 group"
                    >
                        <div>
                            <p className="text-[#6B7280] text-[13px] font-semibold mb-1 uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-[28px] font-bold text-[#111827] tracking-tight">{stat.value}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                            <stat.icon className="text-2xl" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:row gap-4 mb-8">
                <div className="flex flex-wrap gap-2">
                    {['all', 'pending', 'online', 'offline'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-6 py-2.5 rounded-2xl text-[13px] font-bold transition-all border ${
                                filter === f 
                                ? 'bg-gradient-to-r from-orange-500 to-pink-500 border-transparent text-white shadow-lg shadow-orange-500/20' 
                                : 'bg-white border-gray-100 text-gray-500 hover:border-orange-500 hover:text-orange-500'
                            } capitalize`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-2xl">
                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by restaurant name, owner, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-transparent transition-all shadow-sm text-[14px]"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#6B7280] uppercase tracking-widest">Restaurant</th>
                                <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#6B7280] uppercase tracking-widest">Owner</th>
                                <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#6B7280] uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#6B7280] uppercase tracking-widest">Performance</th>
                                <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#6B7280] uppercase tracking-widest">Finance</th>
                                <th className="px-6 py-4 text-right text-[13px] font-semibold text-[#6B7280] uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-[14px] font-medium text-[#6B7280]">Loading Partners...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRestaurants.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                                                    <FaStore className="text-3xl" />
                                                </div>
                                                <p className="text-[14px] font-medium text-[#6B7280]">No partners found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRestaurants.map((restaurant) => (
                                        <motion.tr
                                            key={restaurant._id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                            onClick={() => setSelectedRestaurant(restaurant)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        {restaurant.logo ? (
                                                            <img 
                                                                src={getImageUrl(restaurant.logo)} 
                                                                alt={restaurant.name} 
                                                                className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" 
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-[#FF6A00] font-bold">
                                                                {restaurant.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                                            restaurant.isActive ? 'bg-green-500' : 'bg-gray-300'
                                                        }`}></div>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#111827] text-[14px] group-hover:text-[#FF6A00] transition-colors">{restaurant.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium uppercase tracking-tighter ${
                                                                restaurant.businessType === 'home-chef' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                                {restaurant.businessType === 'home-chef' ? 'Home Chef' : 'Restaurant'}
                                                            </span>
                                                            <span className="text-[12px] text-[#9CA3AF] font-normal">#{restaurant._id.slice(-6).toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[14px]">
                                                    <p className="font-medium text-[#374151] flex items-center gap-1.5">
                                                        <FaUser className="text-[12px] text-gray-300" />
                                                        {restaurant.owner?.name}
                                                    </p>
                                                    <p className="text-[13px] text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                                                        <FaEnvelope className="text-[12px] text-gray-300" />
                                                        {restaurant.owner?.email}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {restaurant.verificationStatus === 'pending' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-yellow-50 text-yellow-600 border border-yellow-100">
                                                            <FaClock className="animate-pulse" /> Pending
                                                        </span>
                                                    ) : restaurant.verificationStatus === 'approved' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                                                            <FaCheckCircle /> Approved
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                                                            <FaTimesCircle /> Rejected
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1 text-[13px] font-semibold text-[#111827]">
                                                        <FaStar className="text-yellow-400 text-[10px]" />
                                                        {restaurant.rating?.toFixed(1) || '0.0'}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[12px] font-medium text-[#6B7280]">
                                                        <FaHistory className="text-[11px]" />
                                                        {restaurant.totalOrders || 0} orders
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <p className="text-[14px] font-semibold text-[#111827]">Rs. {(restaurant.revenue || 0).toLocaleString()}</p>
                                                    <p className="text-[11px] font-medium text-[#FF6A00] mt-0.5">
                                                        Com: Rs. {(restaurant.commission || 0).toLocaleString()} ({restaurant.commissionRate || 15}%)
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    {restaurant.verificationStatus === 'pending' ? (
                                                        <>
                                                            <button
                                                                onClick={(e) => handleApprove(restaurant._id, e)}
                                                                className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                                title="Approve Partner"
                                                            >
                                                                <FaCheckCircle size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleReject(restaurant._id, e)}
                                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                title="Reject Application"
                                                            >
                                                                <FaTimesCircle size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {restaurant.owner?.status === 'suspended' ? (
                                                                <button
                                                                    onClick={(e) => handleUnsuspend(restaurant.owner?._id, e)}
                                                                    className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                                                                    title="Unsuspend"
                                                                >
                                                                    <FaCheckCircle size={14} />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => handleSuspend(restaurant.owner?._id, e)}
                                                                    className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-600 hover:text-white transition-all"
                                                                    title="Suspend"
                                                                >
                                                                    <FaTimesCircle size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => handleDeleteUser(restaurant.owner?._id, e)}
                                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                                                title="Delete Partner"
                                                            >
                                                                <FaTimesCircle className="transform rotate-45" size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enhanced Detail Modal */}
            <AnimatePresence>
                {selectedRestaurant && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md"
                        onClick={() => setSelectedRestaurant(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/20 flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="relative h-48 bg-gray-100 shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-[#FF6A00] to-[#FF8C33] opacity-90"></div>
                                <button 
                                    onClick={() => setSelectedRestaurant(null)}
                                    className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/40 text-white rounded-2xl transition-all z-10 backdrop-blur-md"
                                >
                                    <FaTimesCircle className="text-xl" />
                                </button>
                                
                                <div className="absolute -bottom-12 left-10 flex items-end gap-6">
                                    <div className="relative">
                                        {selectedRestaurant.logo ? (
                                            <img 
                                                src={getImageUrl(selectedRestaurant.logo)} 
                                                alt={selectedRestaurant.name} 
                                                className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl bg-white" 
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-[2rem] bg-white flex items-center justify-center text-[#FF6A00] text-4xl font-bold border-4 border-white shadow-xl">
                                                {selectedRestaurant.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white shadow-sm ${
                                            selectedRestaurant.isActive ? 'bg-green-500' : 'bg-gray-300'
                                        }`}></div>
                                    </div>
                                    <div className="mb-4">
                                        <h3 className="text-[24px] font-semibold text-white tracking-tight">{selectedRestaurant.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border border-white/20">
                                                {selectedRestaurant.businessType}
                                            </span>
                                            <div className="flex items-center gap-1 text-white/90 text-[13px] font-medium">
                                                <FaStar className="text-yellow-300" />
                                                {selectedRestaurant.rating?.toFixed(1) || '0.0'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-10 pt-20">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    {/* Left Column: Info */}
                                    <div className="lg:col-span-2 space-y-10">
                                        {/* Basic Details Grid */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h4 className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wider border-b border-gray-50 pb-2">Business Info</h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3 group">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF] group-hover:text-[#FF6A00] transition-colors">
                                                            <FaMapMarkerAlt size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827] leading-relaxed">{selectedRestaurant.address}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 group">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF] group-hover:text-[#FF6A00] transition-colors">
                                                            <FaPhone size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827]">{selectedRestaurant.contact}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 group">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF] group-hover:text-[#FF6A00] transition-colors">
                                                            <FaBuilding size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827] capitalize">{selectedRestaurant.businessType}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wider border-b border-gray-50 pb-2">Owner & Legal</h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                                            <FaUser size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827]">{selectedRestaurant.owner?.name}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                                            <FaFileImage size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827]">CNIC: {selectedRestaurant.ownerCNIC || 'Not provided'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                                            <FaClock size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827]">Joined: {formatTimeAgo(selectedRestaurant.createdAt)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Documents Section */}
                                        <div className="space-y-4">
                                            <h4 className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wider border-b border-gray-50 pb-2">Verification Documents</h4>
                                            {selectedRestaurant.documents ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {Object.entries(selectedRestaurant.documents).map(([key, value]) => (
                                                        value && (
                                                            <div key={key} className="group relative border border-gray-100 rounded-2xl p-2 bg-gray-50/50 hover:border-[#FF6A00]/30 transition-all hover:shadow-lg">
                                                                <p className="text-[11px] font-medium text-[#9CA3AF] uppercase mb-2 tracking-tight truncate">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                                <div className="aspect-[4/3] relative overflow-hidden rounded-xl bg-white">
                                                                    <img 
                                                                        src={getImageUrl(value as string)} 
                                                                        alt={key} 
                                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.src = getImageFallback('document');
                                                                        }}
                                                                    />
                                                                    <div className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                        <a 
                                                                            href={getImageUrl(value as string)} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            className="bg-white text-gray-900 p-2 rounded-xl hover:bg-[#FF6A00] hover:text-white transition-all shadow-xl"
                                                                        >
                                                                            <FaExternalLinkAlt size={12} />
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                                    <FaFileImage className="text-3xl mx-auto mb-2 text-gray-200" />
                                                    <p className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wider">No documents found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column: Financials & Bank */}
                                    <div className="space-y-8">
                                        {/* Performance Card */}
                                        <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                                            <h4 className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wider mb-6">Partner Performance</h4>
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">Revenue</p>
                                                        <p className="text-[24px] font-bold text-[#111827] tracking-tight">Rs. {(selectedRestaurant.revenue || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-3 bg-green-50 text-green-500 rounded-2xl">
                                                        <FaMoneyBillWave />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">Platform Fees</p>
                                                        <p className="text-[24px] font-bold text-[#FF6A00] tracking-tight">Rs. {(selectedRestaurant.commission || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-3 bg-orange-50 text-[#FF6A00] rounded-2xl">
                                                        <FaPercentage />
                                                    </div>
                                                </div>
                                                <div className="pt-6 border-t border-gray-200 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">Settlement Amount</p>
                                                        <p className="text-[24px] font-bold text-blue-600 tracking-tight">Rs. {((selectedRestaurant.revenue || 0) - (selectedRestaurant.commission || 0)).toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                                        <FaWallet />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bank Details Card */}
                                        <div className="bg-[#FF6A00] rounded-[2rem] p-6 text-white shadow-xl shadow-[#FF6A00]/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                                <FaBuilding size={120} />
                                            </div>
                                            <h4 className="text-[13px] font-medium text-white/60 uppercase tracking-wider mb-6 relative">Settlement Account</h4>
                                            {selectedRestaurant.bankDetails ? (
                                                <div className="space-y-4 relative">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">Holder Name</p>
                                                        <p className="text-[16px] font-bold tracking-wide uppercase">{selectedRestaurant.bankDetails.accountHolderName}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">
                                                            {selectedRestaurant.bankDetails.accountType === 'bank' ? 'IBAN / Account' : 'Phone Number'}
                                                        </p>
                                                        <p className="text-[16px] font-bold tracking-widest">{selectedRestaurant.bankDetails.iban || selectedRestaurant.bankDetails.accountNumber || selectedRestaurant.bankDetails.phoneNumber}</p>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2">
                                                        <div>
                                                            <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">Provider</p>
                                                            <p className="text-[16px] font-bold uppercase">{selectedRestaurant.bankDetails.bankName || selectedRestaurant.bankDetails.accountType}</p>
                                                        </div>
                                                        <div className="bg-white/20 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider border border-white/20">
                                                            {selectedRestaurant.bankDetails.accountType}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[13px] font-medium text-white/80 py-4 italic">No bank details registered</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer Actions */}
                                <div className="mt-12 pt-8 border-t border-gray-50 flex gap-4">
                                    {selectedRestaurant.verificationStatus === 'pending' ? (
                                        <>
                                            <button
                                                onClick={(e) => handleApprove(selectedRestaurant._id, e)}
                                                className="flex-1 flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all shadow-lg shadow-green-600/20 active:scale-[0.98]"
                                            >
                                                <FaCheckCircle /> Approve Application
                                            </button>
                                            <button
                                                onClick={(e) => handleReject(selectedRestaurant._id, e)}
                                                className="flex-1 flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 text-red-600 px-8 py-4 rounded-2xl font-bold text-[14px] transition-all active:scale-[0.98]"
                                            >
                                                <FaTimesCircle /> Reject Application
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex gap-4">
                                            {selectedRestaurant.owner?.status === 'suspended' ? (
                                                <button
                                                    onClick={(e) => handleUnsuspend(selectedRestaurant.owner?._id, e)}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all shadow-lg shadow-green-600/20 active:scale-[0.98]"
                                                >
                                                    Unsuspend Partner
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleSuspend(selectedRestaurant.owner?._id, e)}
                                                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
                                                >
                                                    Suspend Partner
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDeleteUser(selectedRestaurant.owner?._id, e)}
                                                className="flex-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all active:scale-[0.98]"
                                            >
                                                Permanently Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
