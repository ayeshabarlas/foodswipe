'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import toast from 'react-hot-toast';
import { FaUser, FaSearch, FaFilter, FaEye, FaFlag, FaBan, FaCheckCircle, FaTimesCircle, FaSync, FaTimes, FaShoppingBag, FaCalendarAlt, FaEnvelope, FaPhoneAlt, FaHistory, FaCreditCard, FaExclamationTriangle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

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
    firebaseUid?: string;
}

export default function CustomersView() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get(`${API_BASE_URL}/api/admin/users?role=customer`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomers(Array.isArray(res.data) ? res.data : (res.data?.users || []));
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!window.confirm('This will fetch missing users from Firebase. Continue?')) return;
        setSyncing(true);
        const toastId = toast.loading('Syncing with Firebase...');
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.post(`${API_BASE_URL}/api/admin/users/sync`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Sync complete! Synced: ${res.data.syncedCount} new users.`, { id: toastId });
            fetchCustomers();
        } catch (error) {
            console.error('Sync Error:', error);
            toast.error('Failed to sync users', { id: toastId });
        } finally {
            setSyncing(false);
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
            toast.success('Customer suspended');
            fetchCustomers();
            if (selectedCustomer?._id === id) {
                setSelectedCustomer(prev => prev ? { ...prev, status: 'suspended' } : null);
            }
        } catch (error) {
            console.error('Error suspending customer:', error);
            toast.error('Failed to suspend customer');
        }
    };

    const handleUnsuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/unsuspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Customer unsuspended');
            fetchCustomers();
            if (selectedCustomer?._id === id) {
                setSelectedCustomer(prev => prev ? { ...prev, status: 'active' } : null);
            }
        } catch (error) {
            console.error('Error unsuspending customer:', error);
            toast.error('Failed to unsuspend customer');
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
            toast.success('Customer deleted permanently');
            setSelectedCustomer(null);
            fetchCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            toast.error('Failed to delete customer');
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

    const formatTimeAgo = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diffInMs = now.getTime() - then.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 30) return `${diffInDays} days ago`;
        return then.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const stats = {
        total: customers?.length || 0,
        active: Array.isArray(customers) ? customers.filter(c => (c.status === 'active' || !c.status)).length : 0,
        flagged: Array.isArray(customers) ? customers.filter(c => c.status === 'flagged').length : 0,
        totalOrders: Array.isArray(customers) ? customers.reduce((acc, curr) => acc + (curr.totalOrders || 0), 0) : 0
    };

    const filteredCustomers = Array.isArray(customers) ? customers.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone?.includes(searchTerm);
        
        const matchesFilter = filter === 'All' || 
            (filter === 'Active' && (c.status === 'active' || !c.status)) ||
            (filter === 'Flagged' && c.status === 'flagged') ||
            (filter === 'Suspended' && c.status === 'suspended');

        return matchesSearch && matchesFilter;
    }) : [];

    return (
        <div className="p-8 bg-gray-50/30 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-bold text-[#111827] tracking-tight flex items-center gap-3">
                        Customers Management
                        <span className="px-3 py-1 bg-orange-50 text-[#FF6A00] text-[11px] font-bold rounded-full uppercase tracking-wider">
                            {stats.total} Total
                        </span>
                    </h2>
                    <p className="text-[14px] font-medium text-[#6B7280] mt-1">Manage customers and monitor behavior</p>
                </div>
                <button 
                    onClick={handleSync}
                    disabled={syncing}
                    className={`flex items-center gap-2 px-6 py-3 bg-[#FF6A00] text-white rounded-xl text-[13px] font-bold hover:bg-[#e65f00] transition-all shadow-lg shadow-[#FF6A00]/20 uppercase tracking-wider ${syncing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                >
                    <FaSync className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync with Firebase'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Customers', value: stats.total, icon: FaUser, color: 'text-[#FF6A00]', bg: 'bg-orange-50' },
                    { label: 'Active Now', value: stats.active, icon: FaCheckCircle, color: 'text-green-500', bg: 'bg-green-50', pulse: true },
                    { label: 'Total Orders', value: stats.totalOrders, icon: FaShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Flagged Users', value: stats.flagged, icon: FaFlag, color: 'text-red-500', bg: 'bg-red-50' }
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-all group"
                    >
                        <div>
                            <p className="text-[#6B7280] text-[13px] font-bold uppercase tracking-wider mb-2">{stat.label}</p>
                            <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{stat.value}</h3>
                            {stat.pulse && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-widest">Live Now</span>
                                </div>
                            )}
                        </div>
                        <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} shadow-sm group-hover:scale-110 transition-transform`}>
                            <stat.icon className="text-2xl" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="relative w-full md:w-[400px]">
                    <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm" />
                    <input 
                        type="text" 
                        placeholder="Search by name, email or phone..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-[14px] text-[#111827] font-medium focus:ring-2 focus:ring-[#FF6A00]/10 focus:bg-white focus:border-[#FF6A00]/30 transition-all outline-none placeholder:text-[#9CA3AF]"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <FaFilter className="text-[#9CA3AF] text-[10px] mr-3 uppercase font-bold tracking-widest" />
                    {['All', 'Active', 'Flagged', 'Suspended'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap uppercase tracking-wider ${
                                filter === f 
                                ? 'bg-[#FF6A00] text-white shadow-lg shadow-[#FF6A00]/20' 
                                : 'bg-gray-50 text-[#6B7280] hover:bg-gray-100 border border-gray-100'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Customer</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Contact</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Activity</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Joined</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-[#FF6A00]/20 border-t-[#FF6A00] rounded-full animate-spin"></div>
                                                <p className="text-[13px] font-bold text-[#6B7280] uppercase tracking-wider">Loading Customers...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                                                    <FaUser className="text-3xl" />
                                                </div>
                                                <p className="text-[15px] font-bold text-[#111827]">No customers found</p>
                                                <p className="text-[13px] text-[#6B7280]">Try adjusting your search or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <motion.tr 
                                            key={customer._id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setSelectedCustomer(customer)}
                                            className="hover:bg-gray-50/50 transition-all cursor-pointer group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-[#FF6A00] text-lg font-bold group-hover:scale-110 transition-transform shadow-sm">
                                                        {customer.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="text-[15px] font-bold text-[#111827] tracking-tight group-hover:text-[#FF6A00] transition-colors">{customer.name || 'Unnamed User'}</p>
                                                        <p className="text-[13px] text-[#6B7280] font-medium lowercase">{customer.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-[14px] font-bold text-[#111827]">{customer.phone || 'No phone'}</p>
                                                {customer.firebaseUid && (
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 mt-1 inline-block tracking-wider">Firebase Auth</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] font-bold text-[#111827]">{customer.totalOrders || 0}</span>
                                                        <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Orders</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] font-bold text-[#FF6A00]">Rs. {(customer.totalSpent || 0).toLocaleString()}</span>
                                                        <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Spent</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border ${
                                                    customer.status === 'suspended' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    customer.status === 'flagged' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                    'bg-green-50 text-green-600 border-green-100'
                                                }`}>
                                                    {customer.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-[14px] font-bold text-[#111827]">
                                                    {new Date(customer.createdAt).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                                <p className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-widest mt-0.5">{formatTimeAgo(customer.createdAt)}</p>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }}
                                                        className="p-2 bg-orange-50 text-[#FF6A00] rounded-lg hover:bg-[#FF6A00] hover:text-white transition-all shadow-sm"
                                                    >
                                                        <FaEye className="text-xs" />
                                                    </button>
                                                    {customer.status === 'suspended' ? (
                                                        <button 
                                                            onClick={(e) => handleUnsuspend(customer._id, e)}
                                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                            title="Unsuspend"
                                                        >
                                                            <FaCheckCircle className="text-xs" />
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => handleSuspend(customer._id, e)}
                                                            className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-600 hover:text-white transition-all shadow-sm"
                                                            title="Suspend"
                                                        >
                                                            <FaBan className="text-xs" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={(e) => handleDeleteUser(customer._id, e)}
                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                        title="Delete Permanently"
                                                    >
                                                        <FaTimesCircle className="text-xs" />
                                                    </button>
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

            {/* Customer Details Modal */}
            <AnimatePresence>
                {selectedCustomer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedCustomer(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-gray-50 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => setSelectedCustomer(null)}
                                className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white text-gray-500 rounded-full shadow-md z-10 transition-all"
                            >
                                <FaTimes />
                            </button>

                            {/* Modal Header */}
                            <div className="bg-[#FF6A00] p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                                <div className="relative flex items-center gap-6">
                                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-[#FF6A00] text-4xl font-bold shadow-xl border-4 border-white/20">
                                        {selectedCustomer.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-[24px] font-bold tracking-tight">{selectedCustomer.name || 'Unnamed User'}</h2>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30`}>
                                                {selectedCustomer.status || 'Active'}
                                            </span>
                                        </div>
                                        <p className="text-white/80 text-[14px] font-normal flex items-center gap-2">
                                            <FaEnvelope className="text-[12px]" /> {selectedCustomer.email}
                                        </p>
                                        <p className="text-white/60 text-[12px] font-medium uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                            <FaCalendarAlt className="text-[10px]" /> Joined {new Date(selectedCustomer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                        <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-widest mb-1">Total Orders</p>
                                        <p className="text-[24px] font-bold text-[#111827]">{selectedCustomer.totalOrders || 0}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                        <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-widest mb-1">Total Spent</p>
                                        <p className="text-[24px] font-bold text-[#FF6A00]">Rs. {(selectedCustomer.totalSpent || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                        <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-widest mb-1">Avg Order</p>
                                        <p className="text-[24px] font-bold text-blue-600">
                                            Rs. {Math.round(selectedCustomer.avgOrderValue || (selectedCustomer.totalSpent / selectedCustomer.totalOrders) || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                                    <h3 className="text-[13px] font-semibold text-[#111827] uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full"></div>
                                        Contact & Account Info
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-[#FF6A00] shrink-0">
                                                <FaPhoneAlt className="text-xs" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-medium text-[#9CA3AF] uppercase block mb-1">Phone Number</label>
                                                <p className="text-[14px] font-medium text-[#111827]">{selectedCustomer.phone || 'Not Provided'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                                                <FaHistory className="text-xs" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-medium text-[#9CA3AF] uppercase block mb-1">Last Order</label>
                                                <p className="text-[14px] font-medium text-[#111827]">
                                                    {selectedCustomer.lastOrderDate 
                                                        ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                        : 'No orders yet'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500 shrink-0">
                                                <FaUser className="text-xs" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-medium text-[#9CA3AF] uppercase block mb-1">Account Role</label>
                                                <p className="text-[14px] font-medium text-[#111827] uppercase">{selectedCustomer.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 shrink-0">
                                                <FaExclamationTriangle className="text-xs" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-medium text-[#9CA3AF] uppercase block mb-1">Cancellations</label>
                                                <p className={`text-[14px] font-medium ${selectedCustomer.cancellations > 2 ? 'text-red-500' : 'text-[#111827]'}`}>
                                                    {selectedCustomer.cancellations || 0} Orders
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {selectedCustomer.firebaseUid && (
                                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl mb-6 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                                                <FaCreditCard className="text-sm" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">Authentication Provider</p>
                                                <p className="text-[14px] font-medium text-[#111827]">Firebase Auth ID: {selectedCustomer.firebaseUid.substring(0, 15)}...</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-blue-500 text-white text-[11px] font-medium uppercase rounded-lg shadow-sm shadow-blue-500/20">Verified</span>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    {selectedCustomer.status === 'suspended' ? (
                                        <button 
                                            onClick={(e) => handleUnsuspend(selectedCustomer._id, e)}
                                            className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-medium text-[14px] uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                        >
                                            <FaCheckCircle /> Unsuspend Account
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={(e) => handleSuspend(selectedCustomer._id, e)}
                                            className="flex-1 bg-yellow-500 text-white py-3 rounded-2xl font-medium text-[14px] uppercase tracking-widest hover:bg-yellow-600 transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
                                        >
                                            <FaBan /> Suspend Account
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => handleDeleteUser(selectedCustomer._id, e)}
                                        className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-medium text-[14px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                                    >
                                        <FaTimesCircle /> Delete Permanently
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
