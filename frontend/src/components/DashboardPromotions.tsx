'use client';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaUsers, FaPlus, FaTrash, FaTicketAlt, FaTags, FaToggleOn, FaToggleOff, FaClock } from 'react-icons/fa';
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

    const activeVouchers = vouchers.filter(v => v.isActive && new Date(v.expiryDate) > new Date());
    const activeDeals = deals.filter(d => d.isActive && new Date(d.endDate) >= new Date());

    return (
        <div className="p-8 space-y-10 max-w-7xl font-inter bg-[#F8FAFC]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-extrabold uppercase tracking-wider border border-orange-100/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                        Merchant Growth Tools
                    </div>
                    <h2 className="text-4xl font-extrabold text-gray-900 font-plus-jakarta tracking-tight leading-none">Marketing Hub</h2>
                    <p className="text-gray-500 text-[14px] font-medium max-w-md">Strategically boost your restaurant&apos;s performance with professional-grade promotional tools and insights.</p>
                </div>
                <div className="flex items-center gap-6 bg-white p-4 rounded-[24px] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 overflow-hidden shadow-sm">
                                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" className="w-full h-full object-cover opacity-80" />
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[12px] font-extrabold text-gray-900 font-plus-jakarta leading-none">Live Traffic</span>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                12.4k Views Today
                            </span>
                        </div>
                    </div>
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
                            whileHover={{ y: -5 }}
                            className={`rounded-[32px] p-8 border transition-all duration-500 group relative overflow-hidden ${voucher.isActive
                                ? 'bg-white border-orange-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                                : 'bg-gray-50/50 border-gray-100 grayscale opacity-70'
                                }`}
                        >
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-bl-[100px] -z-10 group-hover:bg-orange-100/50 transition-colors duration-500"></div>

                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="font-mono font-black text-2xl text-gray-900 tracking-tighter bg-gray-50 px-5 py-3 rounded-2xl border-2 border-dashed border-gray-200 group-hover:border-orange-500/50 group-hover:bg-white transition-all duration-500">
                                        {voucher.code}
                                    </div>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black mt-4 uppercase tracking-[0.2em] font-plus-jakarta ${voucher.isActive
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-gray-400/10 text-gray-500'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${voucher.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                        {voucher.isActive ? 'Live Now' : 'Paused'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-red-600 font-plus-jakarta leading-none tracking-tighter">
                                        <span className="text-sm font-bold align-top mt-1 mr-0.5">Rs.</span>{voucher.discount}
                                    </div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Discount Value</div>
                                </div>
                            </div>

                            <div className="space-y-5 mb-8">
                                <p className="text-[15px] text-gray-600 font-medium leading-relaxed font-inter">{voucher.description}</p>
                                
                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                    <div className="bg-gray-50/50 p-4 rounded-2xl">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Min. Order</div>
                                        <div className="text-[15px] font-black text-gray-900 font-plus-jakarta">Rs. {voucher.minimumAmount}</div>
                                    </div>
                                    <div className="bg-gray-50/50 p-4 rounded-2xl text-right">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Expires On</div>
                                        <div className="text-[15px] font-black text-gray-900 font-plus-jakarta">{new Date(voucher.expiryDate).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => toggleVoucherStatus(voucher._id)}
                                className={`w-full py-5 rounded-2xl font-black transition-all duration-500 flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] font-plus-jakarta active:scale-95 border-2 ${voucher.isActive
                                    ? 'bg-white border-orange-100 hover:border-orange-500 text-orange-600 hover:shadow-xl hover:shadow-orange-500/10'
                                    : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                                    }`}
                            >
                                {voucher.isActive ? <FaToggleOn size={20} className="text-orange-500" /> : <FaToggleOff size={20} />}
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
                            whileHover={{ y: -5 }}
                            className={`rounded-[32px] p-8 border transition-all duration-500 group relative overflow-hidden ${deal.isActive
                                ? 'bg-white border-purple-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                                : 'bg-gray-50/50 border-gray-100 grayscale opacity-70'
                                }`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/50 rounded-bl-[100px] -z-10 group-hover:bg-purple-100/50 transition-colors duration-500"></div>

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1 mr-4">
                                    <h4 className="font-black text-gray-900 text-xl font-plus-jakarta tracking-tight leading-tight group-hover:text-purple-600 transition-colors mb-2">{deal.title}</h4>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] font-plus-jakarta ${deal.isActive
                                        ? 'bg-purple-500/10 text-purple-600'
                                        : 'bg-gray-400/10 text-gray-500'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${deal.isActive ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                        {deal.isActive ? 'Live Now' : 'Ended'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-600 to-indigo-700 font-plus-jakarta leading-none tracking-tighter">
                                        {deal.discountType === 'percentage' ? (
                                            <>{deal.discount}<span className="text-sm font-bold align-top mt-1 ml-0.5">%</span></>
                                        ) : (
                                            <><span className="text-sm font-bold align-top mt-1 mr-0.5">Rs.</span>{deal.discount}</>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Benefit</div>
                                </div>
                            </div>

                            <div className="space-y-6 mb-8 relative z-10">
                                <p className="text-[15px] text-gray-600 font-medium leading-relaxed font-inter line-clamp-2">{deal.description}</p>
                                
                                <div className="bg-gray-50/80 backdrop-blur-sm rounded-[24px] p-5 border border-gray-100 group-hover:border-purple-200 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <FaClock className="text-purple-400 text-xs" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campaign Period</span>
                                        </div>
                                        <span className="text-[11px] font-black text-gray-900 font-plus-jakarta">
                                            {new Date(deal.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(deal.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200/50 h-2 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: '65%' }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 relative z-10">
                                <button
                                    onClick={() => toggleDealStatus(deal._id)}
                                    className={`flex-1 py-4 rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 text-[11px] uppercase tracking-widest font-plus-jakarta active:scale-95 ${deal.isActive
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:bg-purple-700'
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
