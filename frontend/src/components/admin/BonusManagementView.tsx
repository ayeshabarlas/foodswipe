'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { getApiUrl } from '../../utils/config';
import toast from 'react-hot-toast';
import { 
    FaGift, FaCheckCircle, FaClock, FaMotorcycle, FaSearch, FaFilter,
    FaBicycle, FaHistory, FaTrophy, FaChartBar
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface BonusStat {
    _id: string;
    rider: {
        _id: string;
        fullName: string;
        user: {
            name: string;
            email: string;
            phone: string;
        };
    };
    date: string;
    dailyDeliveryCount: number;
    targetDeliveries: number;
    bonusAmount: number;
    isBonusAchieved: boolean;
    bonusCreditedAt?: string;
}

export default function BonusManagementView() {
    const [bonusStats, setBonusStats] = useState<BonusStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'All' | 'Achieved' | 'In Progress'>('All');

    useEffect(() => {
        fetchBonusStats();

        const socket = getSocket();
        if (socket) {
            const handleUpdate = () => {
                fetchBonusStats();
            };
            socket.on('bonus_progress_updated', handleUpdate);
            socket.on('bonus_achieved', handleUpdate);
            return () => {
                socket.off('bonus_progress_updated', handleUpdate);
                socket.off('bonus_achieved', handleUpdate);
            };
        }
    }, []);

    const fetchBonusStats = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            const res = await axios.get(`${getApiUrl()}/api/bonus/admin/stats`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setBonusStats(res.data);
        } catch (error: any) {
            console.error('Error fetching bonus stats:', error);
            toast.error('Failed to fetch bonus statistics');
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        totalRiders: bonusStats.length,
        achieved: bonusStats.filter(s => s.isBonusAchieved).length,
        totalBonusesPaid: bonusStats.filter(s => s.isBonusAchieved).reduce((acc, curr) => acc + curr.bonusAmount, 0),
        avgProgress: bonusStats.length > 0 
            ? (bonusStats.reduce((acc, curr) => acc + (curr.dailyDeliveryCount / curr.targetDeliveries), 0) / bonusStats.length * 100).toFixed(1)
            : 0
    };

    const filteredStats = bonusStats.filter(stat => {
        const matchesSearch = 
            (stat.rider?.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (stat.rider?.user?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        let matchesFilter = true;
        if (filter === 'Achieved') matchesFilter = stat.isBonusAchieved;
        if (filter === 'In Progress') matchesFilter = !stat.isBonusAchieved;
        
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Rider Bonuses</h2>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Daily Delivery Incentives & Progress</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={fetchBonusStats}
                        className="bg-white border border-gray-100 text-gray-600 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-[14px] hover:border-orange-500 hover:text-orange-500"
                    >
                        <FaHistory className="text-orange-500" /> Refresh Data
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Active Riders', value: stats.totalRiders, icon: FaMotorcycle, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
                    { label: 'Bonuses Achieved', value: stats.achieved, icon: FaTrophy, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                    { label: 'Total Paid Today', value: `Rs. ${stats.totalBonusesPaid}`, icon: FaGift, gradient: 'from-orange-500 to-pink-500', shadow: 'shadow-orange-500/20' },
                    { label: 'Avg. Progress', value: `${stats.avgProgress}%`, icon: FaChartBar, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20' }
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
                            </div>
                            <p className="text-white/70 text-[13px] font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                            <h3 className="text-[28px] font-bold tracking-tight">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex flex-wrap gap-2">
                    {['All', 'Achieved', 'In Progress'].map((f) => (
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
                        placeholder="Search by rider name..."
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
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Goal</th>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Progress</th>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Reward</th>
                                <th className="px-6 py-4 text-left text-[13px] font-medium text-[#6B7280] uppercase tracking-wider">Credited At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-[14px] font-medium text-[#6B7280]">Loading Stats...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-[#9CA3AF]">
                                                    <FaGift className="text-3xl" />
                                                </div>
                                                <p className="text-[14px] font-medium text-[#6B7280]">No bonus stats found for today</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStats.map((stat) => (
                                        <motion.tr
                                            key={stat._id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-gray-50/50 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF6A00] font-bold border border-orange-100 shadow-sm text-[14px]">
                                                        {stat.rider?.fullName?.charAt(0) || stat.rider?.user?.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[14px] font-bold text-[#111827] group-hover:text-orange-500 transition-colors">
                                                            {stat.rider?.fullName || stat.rider?.user?.name}
                                                        </h4>
                                                        <p className="text-[12px] text-[#6B7280]">{stat.rider?.user?.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FaBicycle className="text-gray-400 text-sm" />
                                                    <span className="text-[14px] font-medium text-[#374151]">
                                                        {stat.targetDeliveries} Deliveries
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-full max-w-[150px]">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[12px] font-bold text-[#374151]">
                                                            {stat.dailyDeliveryCount}/{stat.targetDeliveries}
                                                        </span>
                                                        <span className="text-[11px] font-medium text-[#6B7280]">
                                                            {Math.round((stat.dailyDeliveryCount / stat.targetDeliveries) * 100)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min((stat.dailyDeliveryCount / stat.targetDeliveries) * 100, 100)}%` }}
                                                            className={`h-full rounded-full ${
                                                                stat.isBonusAchieved ? 'bg-emerald-500' : 'bg-orange-500'
                                                            }`}
                                                        ></motion.div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {stat.isBonusAchieved ? (
                                                    <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold flex items-center gap-1.5 w-fit border border-emerald-100">
                                                        <FaCheckCircle /> Achieved
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-lg bg-orange-50 text-orange-600 text-[11px] font-bold flex items-center gap-1.5 w-fit border border-orange-100">
                                                        <FaClock /> In Progress
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[14px] font-bold text-[#111827]">
                                                    Rs. {stat.bonusAmount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[13px] text-[#6B7280]">
                                                    {stat.bonusCreditedAt 
                                                        ? new Date(stat.bonusCreditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : '-'}
                                                </span>
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
