'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaUsers, FaPercent, FaPlus, FaTrash, FaTicketAlt, FaTags, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import CreateVoucherModal from './CreateVoucherModal';
import CreateDealModal from './CreateDealModal';

interface Voucher {
    _id: string;
    code: string;
    discount: number;
    description: string;
    expiryDate: string;
    minimumAmount: number;
    isActive: boolean;
}

interface Deal {
    _id: string;
    title: string;
    description: string;
    discount: number;
    discountType: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    minimumAmount: number;
}

export default function DashboardPromotions() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [showDealModal, setShowDealModal] = useState(false);

    const fetchData = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const headers = { Authorization: `Bearer ${token}` };

            const [vouchersRes, dealsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/vouchers/restaurant/my-vouchers`, { headers }),
                axios.get(`${API_BASE_URL}/api/deals/my-deals`, { headers })
            ]);

            setVouchers(vouchersRes.data);
            setDeals(dealsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s for real-time
        return () => clearInterval(interval);
    }, []);

    const toggleVoucherStatus = async (id: string) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/vouchers/${id}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to toggle voucher:', error);
        }
    };

    const toggleDealStatus = async (id: string) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/deals/${id}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to toggle deal:', error);
        }
    };

    const deleteDeal = async (id: string) => {
        if (!confirm('Are you sure you want to delete this deal?')) return;

        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.delete(`${API_BASE_URL}/api/deals/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete deal:', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const StatCard = ({ title, value, icon: Icon, color, lightColor }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${color} rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group border border-white/10`}
        >
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className={`p-4 ${lightColor} rounded-2xl backdrop-blur-md`}>
                    <Icon className="text-2xl" />
                </div>
                <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest font-plus-jakarta">Real-time</div>
            </div>
            <div className="text-4xl font-extrabold font-plus-jakarta mb-2 relative z-10">{value}</div>
            <div className="text-[12px] font-bold text-white/80 uppercase tracking-widest font-plus-jakarta relative z-10">{title}</div>
        </motion.div>
    );

    const activeVouchers = vouchers.filter(v => v.isActive && new Date(v.expiryDate) > new Date());
    const activeDeals = deals.filter(d => d.isActive && new Date(d.endDate) >= new Date());

    return (
        <div className="p-8 space-y-10 max-w-7xl font-inter bg-[#F8FAFC]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 font-plus-jakarta tracking-tight">Marketing Hub</h2>
                    <p className="text-gray-500 text-[13px] font-medium mt-1">Boost your sales with targeted vouchers and exclusive deals</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                    </div>
                    <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest font-plus-jakarta flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        12.4k Views Today
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard
                    title="Active Vouchers"
                    value={activeVouchers.length}
                    icon={FaTicketAlt}
                    color="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E]"
                    lightColor="bg-white/20"
                />
                <StatCard
                    title="Active Deals"
                    value={activeDeals.length}
                    icon={FaTags}
                    color="bg-gradient-to-br from-[#845EF7] to-[#B197FC]"
                    lightColor="bg-white/20"
                />
                <StatCard
                    title="Total Reach"
                    value={vouchers.length + deals.length}
                    icon={FaUsers}
                    color="bg-gradient-to-br from-[#339AF0] to-[#74C0FC]"
                    lightColor="bg-white/20"
                />
                <StatCard
                    title="Campaign Growth"
                    value="+12%"
                    icon={FaChartLine}
                    color="bg-gradient-to-br from-[#51CF66] to-[#8CE99A]"
                    lightColor="bg-white/20"
                />
            </div>

            {/* Vouchers Section */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                            <FaTicketAlt size={20} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 text-lg font-plus-jakarta tracking-tight">Voucher Campaigns</h3>
                            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-widest mt-0.5">Custom Discount Codes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowVoucherModal(true)}
                        className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-2xl font-extrabold shadow-xl shadow-orange-500/20 hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 uppercase text-[11px] tracking-widest font-plus-jakarta"
                    >
                        <FaPlus /> Create New Voucher
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
                    {vouchers.map((voucher) => (
                        <motion.div
                            key={voucher._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`rounded-[32px] p-8 border transition-all duration-300 group hover:shadow-xl ${voucher.isActive
                                ? 'bg-white border-emerald-100 shadow-sm'
                                : 'bg-gray-50/50 border-gray-100 grayscale opacity-70'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="font-mono font-extrabold text-2xl text-gray-900 tracking-tighter bg-gray-50 px-4 py-2 rounded-xl border border-dashed border-gray-200 group-hover:border-orange-500/30 transition-colors">
                                        {voucher.code}
                                    </div>
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold mt-3 uppercase tracking-widest font-plus-jakarta ${voucher.isActive
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-gray-400/10 text-gray-500'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${voucher.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                        {voucher.isActive ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-extrabold text-orange-500 font-plus-jakarta leading-none">
                                        <span className="text-sm font-bold align-top mt-1 mr-0.5">Rs.</span>{voucher.discount}
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Discount</div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <p className="text-sm text-gray-600 font-medium leading-relaxed">{voucher.description}</p>
                                
                                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                                    <div className="flex-1">
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Min. Order</div>
                                        <div className="text-sm font-extrabold text-gray-900 font-plus-jakarta">Rs. {voucher.minimumAmount}</div>
                                    </div>
                                    <div className="flex-1 text-right">
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Expires On</div>
                                        <div className="text-sm font-extrabold text-gray-900 font-plus-jakarta">{new Date(voucher.expiryDate).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => toggleVoucherStatus(voucher._id)}
                                className={`w-full py-4 rounded-2xl font-extrabold transition-all duration-300 flex items-center justify-center gap-3 text-[11px] uppercase tracking-widest font-plus-jakarta active:scale-95 ${voucher.isActive
                                    ? 'bg-orange-50 hover:bg-orange-100 text-orange-600 shadow-sm'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                                    }`}
                            >
                                {voucher.isActive ? <FaToggleOn size={18} /> : <FaToggleOff size={18} />}
                                {voucher.isActive ? 'Deactivate Campaign' : 'Activate Campaign'}
                            </button>
                        </motion.div>
                    ))}
                </div>

                {vouchers.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
                            <FaTicketAlt className="text-4xl text-gray-200" />
                        </div>
                        <h4 className="text-xl font-extrabold text-gray-900 font-plus-jakarta mb-2">No active vouchers</h4>
                        <p className="text-gray-400 text-sm max-w-xs mx-auto">Launch your first voucher campaign to start attracting more customers today!</p>
                    </div>
                )}
            </div>

            {/* Deals Section */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
                            <FaTags size={20} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 text-lg font-plus-jakarta tracking-tight">Exclusive Deals</h3>
                            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-widest mt-0.5">Limited Time Offers</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDealModal(true)}
                        className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-extrabold shadow-xl shadow-purple-500/20 hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 uppercase text-[11px] tracking-widest font-plus-jakarta"
                    >
                        <FaPlus /> Create New Deal
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
                    {deals.map((deal) => (
                        <motion.div
                            key={deal._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`rounded-[32px] p-8 border transition-all duration-300 group hover:shadow-xl ${deal.isActive
                                ? 'bg-white border-purple-100 shadow-sm'
                                : 'bg-gray-50/50 border-gray-100 grayscale opacity-70'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="font-extrabold text-gray-900 text-lg font-plus-jakarta tracking-tight leading-tight group-hover:text-purple-600 transition-colors">{deal.title}</h4>
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold mt-3 uppercase tracking-widest font-plus-jakarta ${deal.isActive
                                        ? 'bg-purple-500/10 text-purple-600'
                                        : 'bg-gray-400/10 text-gray-500'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${deal.isActive ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                        {deal.isActive ? 'Live Now' : 'Ended'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-extrabold text-purple-600 font-plus-jakarta leading-none">
                                        {deal.discountType === 'percentage' ? (
                                            <>{deal.discount}<span className="text-sm font-bold">%</span></>
                                        ) : (
                                            <><span className="text-sm font-bold align-top mt-1 mr-0.5">Rs.</span>{deal.discount}</>
                                        )}
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Benefit</div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <p className="text-sm text-gray-600 font-medium leading-relaxed line-clamp-2">{deal.description}</p>
                                
                                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                                    <div className="flex justify-between mb-3">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</span>
                                        <span className="text-[10px] font-extrabold text-gray-900 font-plus-jakarta">
                                            {new Date(deal.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(deal.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-purple-500 h-full w-2/3 rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => toggleDealStatus(deal._id)}
                                    className={`flex-1 py-4 rounded-2xl font-extrabold transition-all duration-300 flex items-center justify-center gap-3 text-[11px] uppercase tracking-widest font-plus-jakarta active:scale-95 ${deal.isActive
                                        ? 'bg-purple-50 hover:bg-purple-100 text-purple-600 shadow-sm'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    {deal.isActive ? <FaToggleOn size={18} /> : <FaToggleOff size={18} />}
                                    {deal.isActive ? 'Pause' : 'Resume'}
                                </button>
                                <button
                                    onClick={() => deleteDeal(deal._id)}
                                    className="w-14 h-14 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 shadow-sm border border-red-100/50"
                                >
                                    <FaTrash size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {deals.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
                            <FaTags className="text-4xl text-gray-200" />
                        </div>
                        <h4 className="text-xl font-extrabold text-gray-900 font-plus-jakarta mb-2">No active deals</h4>
                        <p className="text-gray-400 text-sm max-w-xs mx-auto">Create a limited-time deal to clear stock or promote new items!</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateVoucherModal
                isOpen={showVoucherModal}
                onClose={() => setShowVoucherModal(false)}
                onSuccess={fetchData}
            />
            <CreateDealModal
                isOpen={showDealModal}
                onClose={() => setShowDealModal(false)}
                onSuccess={fetchData}
            />
        </div>
    );
}
