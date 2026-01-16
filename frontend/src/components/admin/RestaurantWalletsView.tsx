'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import { FaWallet, FaStore, FaMoneyBillWave, FaHistory } from 'react-icons/fa';

interface Wallet {
    _id: string;
    restaurant: {
        _id: string;
        name: string;
        email: string;
        phone: string;
    };
    availableBalance: number;
    pendingPayout: number;
    onHoldAmount: number;
    totalCommissionCollected: number;
    totalEarnings: number;
    lastPayoutDate: string | null;
    commissionRate: number;
}

export default function RestaurantWalletsView() {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            const res = await axios.get(`${API_BASE_URL}/api/finance/restaurant-wallets`, config);
            setWallets(res.data);
        } catch (err: any) {
            console.error('Error fetching restaurant wallets:', err);
            setError(err.response?.data?.message || 'Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-[#FF6A00]/20 border-t-[#FF6A00] rounded-full animate-spin"></div>
                <p className="text-[#6B7280] text-[13px] font-medium animate-pulse uppercase tracking-wider">Loading wallets...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                        <span className="text-xl font-bold">!</span>
                    </div>
                    <div>
                        <h3 className="text-red-900 font-bold text-[14px]">Error Loading Data</h3>
                        <p className="text-red-700 text-[13px]">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    const totalPending = wallets.reduce((sum, w) => sum + w.pendingPayout, 0);
    const totalCommission = wallets.reduce((sum, w) => sum + w.totalCommissionCollected, 0);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">Restaurant Wallets</h1>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Manage restaurant earnings and platform commission splits</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#FF6A00] text-white rounded-xl text-[13px] font-medium uppercase tracking-wider hover:bg-[#FF6A00]/90 shadow-lg shadow-[#FF6A00]/20 transition-all">
                    <FaHistory /> Payout History
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[#6B7280] text-[13px] font-medium uppercase tracking-wider mb-2">Total Restaurants</p>
                            <p className="text-[24px] font-bold text-[#111827] tracking-tight">{wallets.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <FaStore className="text-xl" />
                        </div>
                    </div>
                </div>

                <div className="bg-[#111827] rounded-[2rem] p-6 shadow-xl shadow-gray-200 relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-white/60 text-[13px] font-medium uppercase tracking-wider mb-2">Total Commission</p>
                            <p className="text-[24px] font-bold text-white tracking-tight">{formatCurrency(totalCommission)}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#FF6A00] backdrop-blur-md">
                            <FaMoneyBillWave className="text-xl" />
                        </div>
                    </div>
                </div>

                <div className="bg-[#FF6A00] rounded-[2rem] p-6 shadow-xl shadow-[#FF6A00]/20 relative overflow-hidden group text-white">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-white/70 text-[13px] font-medium uppercase tracking-wider mb-2">Pending Payouts</p>
                            <p className="text-[24px] font-bold text-white tracking-tight">{formatCurrency(totalPending)}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                            <FaWallet className="text-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Wallets Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Restaurant</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Available</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Pending</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Earnings</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Commission</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Last Payout</th>
                                <th className="px-8 py-5 text-right text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {wallets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                <FaWallet className="text-xl" />
                                            </div>
                                            <p className="text-[#9CA3AF] text-[13px] font-medium uppercase tracking-wider">No restaurant wallets found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                wallets.map((wallet) => (
                                    <tr key={wallet._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-[#111827] text-[14px]">{wallet.restaurant?.name || 'Unknown'}</span>
                                                <span className="text-[12px] text-[#6B7280]">{wallet.restaurant?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-[14px] font-bold text-[#111827] tracking-tight">
                                            {formatCurrency(wallet.availableBalance)}
                                        </td>
                                        <td className="px-8 py-5 text-[14px] font-bold text-green-600 tracking-tight">
                                            {formatCurrency(wallet.pendingPayout)}
                                        </td>
                                        <td className="px-8 py-5 text-[14px] font-medium text-[#6B7280] tracking-tight">
                                            {formatCurrency(wallet.totalEarnings)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[#FF6A00] font-bold text-[14px] tracking-tight">{formatCurrency(wallet.totalCommissionCollected)}</span>
                                                <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-tighter">{wallet.commissionRate}% Rate</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[#6B7280] text-[13px] font-medium uppercase tracking-tight">{formatDate(wallet.lastPayoutDate)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-all" title="View History">
                                                    <FaHistory className="text-sm" />
                                                </button>
                                                {wallet.pendingPayout > 0 && (
                                                    <button className="px-3 py-1.5 bg-[#FF6A00] text-white text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-[#FF6A00]/90 transition-all shadow-sm">
                                                        Pay Out
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
