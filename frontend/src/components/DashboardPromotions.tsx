'use client';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaUsers, FaPlus, FaTrash, FaTicketAlt, FaTags, FaToggleOn, FaToggleOff, FaClock } from 'react-icons/fa';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
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

interface StatCardProps {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    lightColor: string;
}

const StatCard = ({ title, value, icon: Icon, color, lightColor }: StatCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileHover={{ y: -8, scale: 1.02 }}
        className={`${color} rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group border border-white/20 transition-all duration-500`}
    >
        {/* Animated Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/25 transition-all duration-700"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-32 h-32 bg-black/10 rounded-full blur-2xl group-hover:bg-black/20 transition-all duration-700"></div>
        
        <div className="flex items-center justify-between mb-10 relative z-10">
            <div className={`p-6 ${lightColor} rounded-[24px] backdrop-blur-xl shadow-2xl border border-white/20 group-hover:scale-110 transition-transform duration-500`}>
                <Icon className="text-4xl" />
            </div>
            <div className="flex flex-col items-end">
                <div className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] font-plus-jakarta">Live Analytics</div>
                <div className="w-16 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden backdrop-blur-sm">
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                        className="w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    />
                </div>
            </div>
        </div>
        
        <div className="space-y-2 relative z-10">
            <div className="text-6xl font-black font-plus-jakarta tracking-tighter drop-shadow-2xl flex items-baseline gap-1">
                {value}
                <span className="text-lg font-bold opacity-40">/mo</span>
            </div>
            <div className="text-[12px] font-black text-white/80 uppercase tracking-[0.2em] font-plus-jakarta">{title}</div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 relative z-10 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest font-inter">Syncing Data</span>
            </div>
            <FaChartLine className="text-white text-sm" />
        </div>
    </motion.div>
);

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
                axios.get(`${getApiUrl()}/api/vouchers/restaurant/my-vouchers`, { headers }),
                axios.get(`${getApiUrl()}/api/deals/my-deals`, { headers })
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
            await axios.put(`${getApiUrl()}/api/vouchers/${id}/toggle`, {}, {
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
            await axios.put(`${getApiUrl()}/api/deals/${id}/toggle`, {}, {
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
            await axios.delete(`${getApiUrl()}/api/deals/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete deal:', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const activeVouchers = vouchers.filter(v => v.isActive);
    const activeDeals = deals.filter(d => d.isActive);

    const totalUses = 0; // Backend stats integration placeholder
    const totalRevenue = 0; // Backend stats integration placeholder
    const avgDiscount = vouchers.length > 0 
        ? Math.round(vouchers.reduce((acc, v) => acc + v.discount, 0) / vouchers.length) 
        : 0;

    return (
        <div className="p-8 space-y-10 max-w-7xl font-inter bg-[#F8FAFC]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 font-plus-jakarta tracking-tight leading-none">Promotions</h2>
                    <p className="text-gray-500 text-[14px]">Manage your restaurant operations</p>
                </div>
            </div>

            <div className="px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 font-plus-jakarta">Promotions & Campaigns</h3>
                        <p className="text-gray-500 text-sm">Manage discounts and marketing campaigns</p>
                    </div>
                    <button
                        onClick={() => setShowVoucherModal(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 mr-2"
                    >
                        <FaPlus /> Create Voucher
                    </button>
                    <button
                        onClick={() => setShowDealModal(true)}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                    >
                        <FaPlus /> Create Discount
                    </button>
                </div>

                {/* Real-time Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[#00C853] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden h-48 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <FaChartLine className="text-2xl opacity-80" />
                            <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Active</span>
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-1">{activeDeals.length + activeVouchers.length}</div>
                            <div className="text-sm opacity-90">Active Discounts</div>
                        </div>
                    </div>

                    <div className="bg-[#3D5AFE] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden h-48 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <FaUsers className="text-2xl opacity-80" />
                            <span className="text-sm font-medium opacity-80 uppercase tracking-wider">This Month</span>
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-1">{totalUses}</div>
                            <div className="text-sm opacity-90">Total Uses</div>
                        </div>
                    </div>

                    <div className="bg-[#AA00FF] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden h-48 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <FaChartLine className="text-2xl opacity-80" />
                            <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Revenue</span>
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-1">Rs. {totalRevenue}</div>
                            <div className="text-sm opacity-90">From Promotions</div>
                        </div>
                    </div>

                    <div className="bg-[#FF6D00] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden h-48 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <FaTags className="text-2xl opacity-80" />
                            <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Avg Discount</span>
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-1">{avgDiscount}%</div>
                            <div className="text-sm opacity-90">Discount Rate</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs/Sections */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 mx-4">
                <div className="mb-8">
                    <h4 className="text-lg font-bold text-gray-900 font-plus-jakarta mb-6">Discount Manager</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Render Real Deals */}
                        {deals.map(deal => (
                            <div key={deal._id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <h5 className="font-bold text-gray-900">{deal.title}</h5>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${deal.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                                        {deal.isActive ? 'active' : 'inactive'}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold text-orange-500 mb-2">
                                    {deal.discountType === 'percentage' ? `${deal.discount}% OFF` : `Rs. ${deal.discount} OFF`}
                                </div>
                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-6">
                                    <FaClock className="text-[10px]" />
                                    {new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="text-[9px] text-gray-400 uppercase font-bold mb-1">Uses</div>
                                        <div className="text-sm font-bold text-gray-900">0</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="text-[9px] text-gray-400 uppercase font-bold mb-1">Revenue</div>
                                        <div className="text-sm font-bold text-gray-900">Rs. 0</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => toggleDealStatus(deal._id)}
                                        className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        {deal.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button 
                                        onClick={() => deleteDeal(deal._id)}
                                        className="flex-1 py-2 rounded-lg border border-red-100 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Render Real Vouchers */}
                        {vouchers.map(voucher => (
                            <div key={voucher._id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <h5 className="font-bold text-gray-900">Code: {voucher.code}</h5>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${voucher.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                                        {voucher.isActive ? 'active' : 'inactive'}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold text-orange-500 mb-2">
                                    Rs. {voucher.discount} OFF
                                </div>
                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-6">
                                    <FaClock className="text-[10px]" />
                                    Expires: {new Date(voucher.expiryDate).toLocaleDateString()}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="text-[9px] text-gray-400 uppercase font-bold mb-1">Uses</div>
                                        <div className="text-sm font-bold text-gray-900">0</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="text-[9px] text-gray-400 uppercase font-bold mb-1">Revenue</div>
                                        <div className="text-sm font-bold text-gray-900">Rs. 0</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => toggleVoucherStatus(voucher._id)}
                                        className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        {voucher.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {vouchers.length === 0 && deals.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-300 mb-4 flex justify-center"><FaTags size={48} /></div>
                            <p className="text-gray-500 font-medium">No active promotions or deals found.</p>
                            <p className="text-gray-400 text-sm mt-1">Create your first discount to see it here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showVoucherModal && <CreateVoucherModal isOpen={showVoucherModal} onClose={() => { setShowVoucherModal(false); fetchData(); }} />}
            {showDealModal && <CreateDealModal isOpen={showDealModal} onClose={() => { setShowDealModal(false); fetchData(); }} />}
        </div>
    );
}
