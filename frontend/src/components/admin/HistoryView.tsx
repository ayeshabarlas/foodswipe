'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../utils/config';
import toast from 'react-hot-toast';
import { FaHistory, FaSearch, FaFilter, FaUser, FaStore, FaMotorcycle, FaTrash, FaBan, FaCheckCircle, FaCalendarAlt, FaInfoCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditLog {
    _id: string;
    event: string;
    userId: string;
    email: string;
    role: string;
    details: any;
    timestamp: string;
}

export default function HistoryView() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            const res = await axios.get(`${getApiUrl()}/api/admin/history`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setLogs(res.data);
        } catch (error: any) {
            console.error('Error fetching history:', error);
            if (error.response?.status !== 401) {
                toast.error('Failed to fetch action history');
            }
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (event: string) => {
        if (event.includes('DELETE')) return <FaTrash className="text-red-500" />;
        if (event.includes('SUSPEND')) return <FaBan className="text-orange-500" />;
        if (event.includes('UNSUSPEND')) return <FaCheckCircle className="text-green-500" />;
        return <FaInfoCircle className="text-blue-500" />;
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'customer': return <FaUser className="text-blue-500" />;
            case 'restaurant': return <FaStore className="text-purple-500" />;
            case 'rider': return <FaMotorcycle className="text-green-500" />;
            default: return <FaUser className="text-gray-500" />;
        }
    };

    const formatEventName = (event: string) => {
        return event.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    const filteredLogs = logs.filter(log => {
        if (!log || !log.event) return false;

        const matchesSearch = (log.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (log.event?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (log.role?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        const matchesFilter = filter === 'All' || 
            (filter === 'Suspensions' && log.event?.includes('SUSPEND')) ||
            (filter === 'Deletions' && log.event?.includes('DELETE')) ||
            (filter === 'Customers' && log.role === 'customer') ||
            (filter === 'Restaurants' && log.role === 'restaurant') ||
            (filter === 'Riders' && log.role === 'rider');

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-8 bg-gray-50/30 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-bold text-[#111827] tracking-tight flex items-center gap-3">
                        Action History
                        <span className="px-3 py-1 bg-orange-50 text-[#FF6A00] text-[11px] font-bold rounded-full uppercase tracking-wider">
                            {logs.length} Total Logs
                        </span>
                    </h2>
                    <p className="text-[14px] font-medium text-[#6B7280] mt-1">Audit log for all admin suspension and deletion actions</p>
                </div>
                <button 
                    onClick={fetchHistory}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-[#111827] rounded-xl text-[13px] font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                >
                    <FaHistory className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="relative w-full md:w-[400px]">
                    <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm" />
                    <input 
                        type="text" 
                        placeholder="Search by email, action or role..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-[14px] text-[#111827] font-medium focus:ring-2 focus:ring-orange-500/10 focus:bg-white focus:border-orange-500/30 transition-all outline-none placeholder:text-[#9CA3AF]"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <FaFilter className="text-[#9CA3AF] text-[10px] mr-3 uppercase font-bold tracking-widest" />
                    {['All', 'Suspensions', 'Deletions', 'Customers', 'Restaurants', 'Riders'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap uppercase tracking-wider ${
                                filter === f 
                                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20' 
                                : 'bg-gray-50 text-[#6B7280] hover:bg-gray-100 border border-gray-100'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Action</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">User/Entity</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Role</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Reason / Details</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-[#FF6A00]/20 border-t-[#FF6A00] rounded-full animate-spin"></div>
                                                <p className="text-[13px] font-bold text-[#6B7280] uppercase tracking-wider">Loading history...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                                                    <FaHistory className="text-3xl" />
                                                </div>
                                                <p className="text-[15px] font-bold text-[#111827]">No action history found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <motion.tr 
                                            key={log._id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50/50 transition-all group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        {getEventIcon(log.event)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-[#111827] tracking-tight">{formatEventName(log.event)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="text-[14px] font-medium text-[#111827]">{log.email || 'N/A'}</p>
                                                        <p className="text-[11px] text-[#6B7280] font-mono">ID: {typeof log.userId === 'string' ? log.userId.slice(-8) : 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    {getRoleIcon(log.role)}
                                                    <span className="text-[13px] font-bold text-[#111827] uppercase">{log.role}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="max-w-[300px]">
                                                    <p className="text-[13px] text-[#4B5563] font-medium leading-relaxed">
                                                        {log.details?.reason || log.details?.message || 'No specific reason provided'}
                                                    </p>
                                                    {log.details?.unsuspendAt && (
                                                        <p className="text-[11px] text-orange-600 font-bold mt-1 uppercase tracking-wider">
                                                            Until: {new Date(log.details.unsuspendAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-[#6B7280]">
                                                    <FaCalendarAlt className="text-[12px]" />
                                                    <p className="text-[13px] font-medium">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </p>
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
        </div>
    );
}
