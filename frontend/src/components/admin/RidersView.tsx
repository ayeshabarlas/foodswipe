'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { getApiUrl } from '../../utils/config';
import { getImageUrl, getImageFallback } from '../../utils/imageUtils';
import toast from 'react-hot-toast';
import { 
    FaUser, FaMotorcycle, FaSearch, FaFilter, FaMapMarkerAlt, 
    FaStar, FaEye, FaPlus, FaCheckCircle, FaBan, FaTrash, 
    FaUniversity, FaCreditCard, FaUserTie, FaTimes, FaPhone, 
    FaEnvelope, FaCalendarAlt, FaHistory, FaWallet, FaPercentage,
    FaMoneyBillWave, FaExternalLinkAlt, FaClock, FaTimesCircle,
    FaIdCard
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface Rider {
    _id: string;
    fullName: string;
    cnicNumber?: string;
    dateOfBirth?: string;
    licenseNumber?: string;
    user: { _id: string; name: string; email: string; phone: string; phoneNumber?: string; status: string; createdAt: string };
    vehicleType: string;
    vehicleNumber: string;
    status: string;
    isOnline: boolean;
    verificationStatus: 'new' | 'pending' | 'approved' | 'rejected';
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
        onTimeRate?: number;
    };
    documents?: {
        cnicFront?: string;
        cnicBack?: string;
        drivingLicense?: string;
        vehicleRegistration?: string;
        profileSelfie?: string;
    };
    wallet?: {
        pendingWithdraw?: number;
        bonuses?: number;
    };
    bankDetails?: {
        bankName: string;
        accountNumber: string;
        accountTitle: string;
    };
    createdAt: string;
}

export default function RidersView() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'All' | 'Online' | 'Offline' | 'Pending'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRider, setSelectedRider] = useState<Rider | null>(null);

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
        fetchRiders();

        const socket = getSocket();
        if (socket) {
            const handleUpdate = () => {
                console.log('Rider update received, refreshing...');
                fetchRiders();
            };

            socket.on('rider_registered', handleUpdate);
            socket.on('rider_updated', handleUpdate);
            socket.on('user_updated', handleUpdate);
            socket.on('order_updated', handleUpdate);

            return () => {
                socket.off('rider_registered', handleUpdate);
                socket.off('rider_updated', handleUpdate);
                socket.off('user_updated', handleUpdate);
                socket.off('order_updated', handleUpdate);
            };
        }
    }, []);

    const fetchRiders = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            const res = await axios.get(`${getApiUrl()}/api/admin/riders`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            const data = res.data;
            const ridersList = Array.isArray(data) ? data : (Array.isArray(data.riders) ? data.riders : []);
            setRiders(ridersList);
            
            if (selectedRider) {
                const updated = ridersList.find((r: Rider) => r._id === selectedRider._id);
                if (updated) setSelectedRider(updated);
            }
        } catch (error: any) {
            console.error('Error fetching riders:', error);
            if (error.response?.status !== 401) {
                toast.error('Failed to fetch riders');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Approve this rider?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            await axios.put(`${getApiUrl()}/api/admin/riders/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            toast.success('Rider approved');
            fetchRiders();
            if (selectedRider?._id === id) {
                setSelectedRider(prev => prev ? { ...prev, verificationStatus: 'approved' } : null);
            }
        } catch (error: any) {
            console.error('Error approving rider:', error);
            toast.error(error.response?.data?.message || 'Failed to approve rider');
        }
    };

    const handleReject = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            await axios.put(`${getApiUrl()}/api/admin/riders/${id}/reject`, { reason }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            toast.success('Rider application rejected');
            fetchRiders();
            if (selectedRider?._id === id) {
                setSelectedRider(prev => prev ? { ...prev, verificationStatus: 'rejected' } : null);
            }
        } catch (error: any) {
            console.error('Error rejecting rider:', error);
            toast.error(error.response?.data?.message || 'Failed to reject rider');
        }
    };

    const handleSuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Suspend this rider?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            await axios.put(`${getApiUrl()}/api/admin/users/${id}/suspend`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            toast.success('Rider suspended');
            fetchRiders();
        } catch (error: any) {
            console.error('Error suspending rider:', error);
            toast.error(error.response?.data?.message || 'Failed to suspend rider');
        }
    };

    const handleUnsuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            await axios.put(`${getApiUrl()}/api/admin/users/${id}/unsuspend`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            toast.success('Rider unsuspended');
            fetchRiders();
        } catch (error: any) {
            console.error('Error unsuspending rider:', error);
            toast.error(error.response?.data?.message || 'Failed to unsuspend rider');
        }
    };

    const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('DANGER: Permanently delete this rider account?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            await axios.delete(`${getApiUrl()}/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            toast.success('Rider deleted');
            if (selectedRider?.user?._id === id) setSelectedRider(null);
            fetchRiders();
        } catch (error: any) {
            console.error('Error deleting rider:', error);
            toast.error(error.response?.data?.message || 'Failed to delete rider');
        }
    };

    const stats = {
        total: riders?.length || 0,
        online: riders.filter(r => r.isOnline).length,
        pending: riders.filter(r => r.verificationStatus === 'pending' || r.verificationStatus === 'new').length,
        totalDeliveries: riders.reduce((acc, curr) => acc + (curr.stats?.totalDeliveries || 0), 0)
    };

    const filteredRiders = riders.filter(rider => {
        const matchesSearch =
            (rider.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rider.user?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rider.user?.phone || '').includes(searchTerm);
        
        let matchesFilter = true;
        if (filter === 'Online') matchesFilter = rider.isOnline;
        if (filter === 'Offline') matchesFilter = !rider.isOnline;
        if (filter === 'Pending') matchesFilter = rider.verificationStatus === 'pending' || rider.verificationStatus === 'new';
        
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Riders</h2>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Delivery Partner Management</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-gray-100 text-gray-600 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-[14px] hover:border-blue-500 hover:text-blue-500">
                        <FaMapMarkerAlt className="text-blue-500" /> Live Track Map
                    </button>
                    <button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2 text-[14px] active:scale-95">
                        <FaPlus /> Add New Rider
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Total Partners', value: stats.total, icon: FaUser, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
                    { label: 'Online Now', value: stats.online, icon: FaMotorcycle, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', pulse: true },
                    { label: 'Pending Review', value: stats.pending, icon: FaClock, gradient: 'from-orange-500 to-pink-500', shadow: 'shadow-orange-500/20' },
                    { label: 'Total Deliveries', value: stats.totalDeliveries, icon: FaCheckCircle, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20' }
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`bg-gradient-to-br ${stat.gradient} p-6 rounded-[2rem] shadow-xl ${stat.shadow} text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}
                    >
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                    <stat.icon className="text-xl" />
                                </div>
                                {stat.pulse && (
                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-white/70 text-[13px] font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                            <h3 className="text-[28px] font-bold tracking-tight">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:row gap-4 mb-8">
                <div className="flex flex-wrap gap-2">
                    {['All', 'Online', 'Offline', 'Pending'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${
                                filter === f 
                                ? 'bg-gradient-to-r from-orange-500 to-pink-500 border-transparent text-white shadow-lg shadow-orange-500/20' 
                                : 'bg-white border-gray-200 text-[#6B7280] hover:border-orange-500 hover:text-orange-500'
                            } capitalize`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-2xl">
                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                        type="text"
                        placeholder="Search by rider name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition-all shadow-sm text-[14px] text-[#111827] placeholder-[#9CA3AF]"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Rider</th>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Performance</th>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Wallet</th>
                                <th className="px-6 py-4 text-right text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-[14px] font-medium text-[#6B7280]">Loading Riders...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRiders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-[#9CA3AF]">
                                                    <FaUser className="text-3xl" />
                                                </div>
                                                <p className="text-[14px] font-medium text-[#6B7280]">No riders found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRiders.map((rider) => (
                                        <motion.tr
                                            key={rider._id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                            onClick={() => setSelectedRider(rider)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-[#FF6A00] font-bold border-2 border-white shadow-sm text-[16px]">
                                                            {rider.fullName?.charAt(0) || rider.user?.name?.charAt(0)}
                                                        </div>
                                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                                            rider.isOnline ? 'bg-green-500' : 'bg-gray-300'
                                                        }`}></div>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#111827] text-[14px] group-hover:text-[#FF6A00] transition-colors">{rider.fullName || rider.user?.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[12px] text-[#6B7280] font-medium">{rider.user?.phone || rider.user?.phoneNumber || 'No phone'}</span>
                                                            <span className="text-[12px] text-[#9CA3AF]">•</span>
                                                            <span className="text-[12px] text-[#9CA3AF] font-medium">#{rider._id.slice(-6).toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[14px]">
                                                    <p className="font-semibold text-[#111827] flex items-center gap-1.5">
                                                        <FaMotorcycle className="text-[12px] text-[#9CA3AF]" />
                                                        {rider.vehicleType}
                                                    </p>
                                                    <p className="text-[12px] text-[#6B7280] mt-0.5 font-medium uppercase tracking-wider">
                                                        {rider.vehicleNumber}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {rider.verificationStatus === 'pending' || rider.verificationStatus === 'new' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-yellow-50 text-yellow-600 border border-yellow-100">
                                                            <FaClock className="animate-pulse" /> Pending
                                                        </span>
                                                    ) : rider.verificationStatus === 'approved' ? (
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
                                                        {rider.stats?.rating?.toFixed(1) || '0.0'}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[12px] font-medium text-[#6B7280]">
                                                        <FaHistory className="text-[11px]" />
                                                        {rider.stats?.totalDeliveries || 0} deliveries
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <p className="text-[14px] font-semibold text-[#111827]">Rs. {(rider.earnings?.total || 0).toLocaleString()}</p>
                                                    <p className="text-[11px] font-medium text-[#FF6A00] mt-0.5">
                                                        COD: Rs. {(rider.cashCollected || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setSelectedRider(rider)}
                                                        className="p-2.5 bg-gray-50 text-[#9CA3AF] rounded-xl hover:bg-gray-100 hover:text-[#FF6A00] transition-all"
                                                        title="View Details"
                                                    >
                                                        <FaEye size={14} />
                                                    </button>
                                                    {rider.user?.status === 'suspended' ? (
                                                        <button
                                                            onClick={(e) => handleUnsuspend(rider.user?._id, e)}
                                                            className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                                                            title="Unsuspend Rider"
                                                        >
                                                            <FaCheckCircle size={14} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => handleSuspend(rider.user?._id, e)}
                                                            className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-600 hover:text-white transition-all"
                                                            title="Suspend Rider"
                                                        >
                                                            <FaBan size={14} />
                                                        </button>
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

            {/* Rider Detail Modal */}
            <AnimatePresence>
                {selectedRider && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md"
                        onClick={() => setSelectedRider(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/20 flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="relative h-48 shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 opacity-90"></div>
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
                                </div>
                                <button 
                                    onClick={() => setSelectedRider(null)}
                                    className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/40 text-white rounded-2xl transition-all z-10 backdrop-blur-md border border-white/10 active:scale-90"
                                >
                                    <FaTimesCircle className="text-xl" />
                                </button>
                                
                                <div className="absolute -bottom-12 left-10 flex items-end gap-6">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-[2rem] bg-white flex items-center justify-center text-orange-500 text-4xl font-bold border-4 border-white shadow-2xl group overflow-hidden">
                                            <div className="absolute inset-0 bg-orange-50 group-hover:bg-orange-100 transition-colors"></div>
                                            <span className="relative z-10">{selectedRider.fullName?.charAt(0) || selectedRider.user?.name?.charAt(0)}</span>
                                        </div>
                                        <div className={`absolute bottom-2 right-2 w-7 h-7 rounded-full border-4 border-white shadow-lg ${
                                            selectedRider.isOnline ? 'bg-green-500' : 'bg-gray-300'
                                        }`}></div>
                                    </div>
                                    <div className="mb-4">
                                        <h3 className="text-[28px] font-bold text-white tracking-tight drop-shadow-sm">{selectedRider.fullName || selectedRider.user?.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-white/20">
                                                {selectedRider.vehicleType} Partner
                                            </span>
                                            <div className="flex items-center gap-1.5 text-white bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[13px] font-bold border border-white/10">
                                                <FaStar className="text-yellow-400" />
                                                {selectedRider.stats?.rating?.toFixed(1) || '0.0'}
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
                                                <h4 className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wider border-b border-gray-50 pb-2">Rider Information</h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3 group">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF] group-hover:text-[#FF6A00] transition-colors">
                                                            <FaPhone size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827]">{selectedRider.user?.phone || selectedRider.user?.phoneNumber || 'No phone'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 group">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF] group-hover:text-[#FF6A00] transition-colors">
                                                            <FaEnvelope size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827] truncate">{selectedRider.user?.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 group">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF] group-hover:text-[#FF6A00] transition-colors">
                                                            <FaIdCard size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827]">CNIC: {selectedRider.cnicNumber || 'N/A'}</p>
                                                    </div>
                                                    {selectedRider.dateOfBirth && (
                                                        <div className="flex items-center gap-3 group">
                                                            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF] group-hover:text-[#FF6A00] transition-colors">
                                                                <FaCalendarAlt size={14} />
                                                            </div>
                                                            <p className="text-[14px] font-normal text-[#111827]">DOB: {new Date(selectedRider.dateOfBirth).toLocaleDateString()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wider border-b border-gray-50 pb-2">Vehicle & Legal</h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                                            <FaMotorcycle size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827] capitalize">{selectedRider.vehicleType}: {selectedRider.vehicleNumber}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                                            <FaIdCard size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827]">License: {selectedRider.licenseNumber || 'N/A'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                                            <FaClock size={14} />
                                                        </div>
                                                        <p className="text-[14px] font-normal text-[#111827]">Joined: {formatTimeAgo(selectedRider.user?.createdAt)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Documents Section */}
                                        <div className="space-y-4">
                                            <h4 className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wider border-b border-gray-50 pb-2">Verification Documents</h4>
                                            {selectedRider.documents && Object.keys(selectedRider.documents).length > 0 && Object.values(selectedRider.documents).some(v => v) ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {Object.entries(selectedRider.documents).map(([key, value]) => (
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
                                                    <FaPlus className="text-3xl mx-auto mb-2 text-gray-200" />
                                                    <p className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wider">No documents found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column: Financials & Bank */}
                                    <div className="space-y-8">
                                        {/* Performance Card */}
                                        <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                                            <h4 className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wider mb-6">Rider Performance</h4>
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">Total Deliveries</p>
                                                        <p className="text-[24px] font-bold text-[#111827] tracking-tight">{selectedRider.stats?.totalDeliveries || 0}</p>
                                                    </div>
                                                    <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                                                        <FaCheckCircle />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">Success Rate</p>
                                                        <p className="text-[24px] font-bold text-green-600 tracking-tight">{selectedRider.stats?.successRate || 100}%</p>
                                                    </div>
                                                    <div className="p-3 bg-green-50 text-green-500 rounded-2xl">
                                                        <FaPercentage />
                                                    </div>
                                                </div>
                                                <div className="pt-6 border-t border-gray-200 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">On-Time Rate</p>
                                                        <p className="text-[24px] font-bold text-blue-600 tracking-tight">{selectedRider.stats?.onTimeRate || 100}%</p>
                                                    </div>
                                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                                        <FaClock />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bank Details Card */}
                                        <div className="bg-[#FF6A00] rounded-[2rem] p-6 text-white shadow-xl shadow-[#FF6A00]/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                                <FaUniversity size={120} />
                                            </div>
                                            <h4 className="text-[13px] font-medium text-white/60 uppercase tracking-wider mb-6 relative">Settlement Account</h4>
                                            {selectedRider.bankDetails && (selectedRider.bankDetails.accountNumber || selectedRider.bankDetails.bankName) ? (
                                                <div className="space-y-4 relative">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">Holder Name</p>
                                                        <p className="text-[16px] font-bold tracking-wide uppercase">{selectedRider.bankDetails.accountTitle}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">Account Number</p>
                                                        <p className="text-[16px] font-bold tracking-widest">{selectedRider.bankDetails.accountNumber}</p>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2">
                                                        <div>
                                                            <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">Bank Name</p>
                                                            <p className="text-[16px] font-bold uppercase">{selectedRider.bankDetails.bankName}</p>
                                                        </div>
                                                        <div className="bg-white/20 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider border border-white/20">
                                                            Active
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
                                    {selectedRider.verificationStatus === 'pending' || selectedRider.verificationStatus === 'new' ? (
                                        <>
                                            <button
                                                onClick={(e) => handleApprove(selectedRider._id, e)}
                                                className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                            >
                                                <FaCheckCircle /> Approve Rider
                                            </button>
                                            <button
                                                onClick={(e) => handleReject(selectedRider._id, e)}
                                                className="flex-1 flex items-center justify-center gap-3 bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 px-8 py-4 rounded-2xl font-bold text-[14px] transition-all active:scale-95"
                                            >
                                                <FaTimesCircle /> Reject Application
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex gap-4">
                                            {selectedRider.user?.status === 'suspended' ? (
                                                <button
                                                    onClick={(e) => handleUnsuspend(selectedRider.user?._id, e)}
                                                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                                >
                                                    Unsuspend Partner
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleSuspend(selectedRider.user?._id, e)}
                                                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                                >
                                                    Suspend Partner
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDeleteUser(selectedRider.user?._id, e)}
                                                className="flex-1 bg-white border-2 border-red-100 text-red-500 hover:bg-red-600 hover:text-white hover:border-transparent px-8 py-4 rounded-2xl font-bold text-[14px] transition-all active:scale-95"
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

