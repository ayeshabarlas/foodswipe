'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaUsers, FaDollarSign, FaPercent, FaPlus, FaTrash, FaTicketAlt, FaTags, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import axios from 'axios';
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
                axios.get('http://localhost:5000/api/vouchers/restaurant/my-vouchers', { headers }),
                axios.get('http://localhost:5000/api/deals/my-deals', { headers })
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
            await axios.put(`http://localhost:5000/api/vouchers/${id}/toggle`, {}, {
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
            await axios.put(`http://localhost:5000/api/deals/${id}/toggle`, {}, {
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
            await axios.delete(`http://localhost:5000/api/deals/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete deal:', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${color} rounded-2xl p-6 text-white shadow-lg`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                    <Icon className="text-2xl" />
                </div>
            </div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm opacity-90">{title}</div>
        </motion.div>
    );

    const activeVouchers = vouchers.filter(v => v.isActive && new Date(v.expiryDate) > new Date());
    const activeDeals = deals.filter(d => d.isActive && new Date(d.endDate) >= new Date());

    return (
        <div className="p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Promotions</h2>
                <p className="text-gray-500 text-sm">Manage your vouchers and deals</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Vouchers"
                    value={activeVouchers.length}
                    icon={FaTicketAlt}
                    color="bg-gradient-to-br from-orange-500 to-red-500"
                />
                <StatCard
                    title="Active Deals"
                    value={activeDeals.length}
                    icon={FaTags}
                    color="bg-gradient-to-br from-purple-500 to-pink-500"
                />
                <StatCard
                    title="Total Vouchers"
                    value={vouchers.length}
                    icon={FaChartLine}
                    color="bg-gradient-to-br from-blue-500 to-indigo-500"
                />
                <StatCard
                    title="Total Deals"
                    value={deals.length}
                    icon={FaDollarSign}
                    color="bg-gradient-to-br from-green-500 to-emerald-500"
                />
            </div>

            {/* Vouchers Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FaTicketAlt className="text-orange-500" />
                        Vouchers
                    </h3>
                    <button
                        onClick={() => setShowVoucherModal(true)}
                        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition flex items-center gap-2"
                    >
                        <FaPlus /> Create Voucher
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {vouchers.map((voucher) => (
                        <motion.div
                            key={voucher._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`rounded-xl p-6 border-2 ${voucher.isActive
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="font-mono font-bold text-xl text-gray-900">{voucher.code}</div>
                                    <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${voucher.isActive
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-500 text-white'
                                        }`}>
                                        {voucher.isActive ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-orange-500">
                                    Rs. {voucher.discount}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-3">{voucher.description}</p>

                            <div className="text-xs text-gray-500 mb-3">
                                Min: Rs. {voucher.minimumAmount} | Expires: {new Date(voucher.expiryDate).toLocaleDateString()}
                            </div>

                            <button
                                onClick={() => toggleVoucherStatus(voucher._id)}
                                className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${voucher.isActive
                                    ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                {voucher.isActive ? <FaToggleOn /> : <FaToggleOff />}
                                {voucher.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                        </motion.div>
                    ))}
                </div>

                {vouchers.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <FaTicketAlt className="text-5xl mx-auto mb-4 opacity-50" />
                        <p>No vouchers yet. Create your first voucher!</p>
                    </div>
                )}
            </div>

            {/* Deals Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FaTags className="text-purple-500" />
                        Deals
                    </h3>
                    <button
                        onClick={() => setShowDealModal(true)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition flex items-center gap-2"
                    >
                        <FaPlus /> Create Deal
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {deals.map((deal) => (
                        <motion.div
                            key={deal._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`rounded-xl p-6 border-2 ${deal.isActive
                                ? 'bg-purple-50 border-purple-200'
                                : 'bg-gray-50 border-gray-200'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-gray-900">{deal.title}</h4>
                                    <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${deal.isActive
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-500 text-white'
                                        }`}>
                                        {deal.isActive ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-purple-500">
                                    {deal.discountType === 'percentage' ? `${deal.discount}%` : `Rs. ${deal.discount}`}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-3">{deal.description}</p>

                            <div className="text-xs text-gray-500 mb-3">
                                Min: Rs. {deal.minimumAmount} | {new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleDealStatus(deal._id)}
                                    className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${deal.isActive
                                        ? 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    {deal.isActive ? <FaToggleOn /> : <FaToggleOff />}
                                    {deal.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                    onClick={() => deleteDeal(deal._id)}
                                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {deals.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <FaTags className="text-5xl mx-auto mb-4 opacity-50" />
                        <p>No deals yet. Create your first deal!</p>
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
