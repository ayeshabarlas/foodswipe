'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../utils/config';
import { FaWallet, FaMotorcycle, FaMoneyBillWave, FaHistory } from 'react-icons/fa';

interface Wallet {
    _id: string;
    rider: {
        _id: string;
        name: string;
        email: string;
        phone: string;
        stats?: {
            completedDeliveries: number;
        };
        earnings?: {
            total: number;
        };
    };
    cashCollected: number;
    deliveryEarnings: number;
    availableWithdraw: number;
    cashToDeposit: number;
    totalEarnings: number;
    penalties: number;
    bonuses: number;
    lastWithdrawDate: string | null;
}

export default function RiderWalletsView() {
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

            const res = await axios.get(`${getApiUrl()}/api/finance/rider-wallets`, config);
            setWallets(res.data);
        } catch (err: any) {
            console.error('Error fetching rider wallets:', err);
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
            <div className="p-8 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <span className="text-red-700">{error}</span>
                </div>
            </div>
        );
    }

    const totalPending = wallets.reduce((sum, w) => sum + w.availableWithdraw, 0);
    const totalCashToDeposit = wallets.reduce((sum, w) => sum + w.cashToDeposit, 0);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">Rider Wallets</h1>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Manage rider earnings, cash collections, and payouts</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-lg hover:shadow-purple-500/5 transition-all group active:scale-[0.98]">
                    <div>
                        <p className="text-gray-400 text-[11px] uppercase font-bold mb-1 tracking-widest">Total Active Riders</p>
                        <h3 className="text-[32px] font-bold text-[#111827] tracking-tight">{wallets.length}</h3>
                    </div>
                    <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
                        <FaMotorcycle className="text-2xl" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2rem] shadow-xl shadow-emerald-500/10 flex items-center justify-between hover:shadow-2xl transition-all group active:scale-[0.98] text-white relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] uppercase font-bold mb-1 tracking-widest">Pending Withdrawals</p>
                        <h3 className="text-[32px] font-bold tracking-tight">{formatCurrency(totalPending)}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <FaWallet className="text-2xl" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-pink-600 p-8 rounded-[2rem] shadow-xl shadow-red-500/10 flex items-center justify-between hover:shadow-2xl transition-all group active:scale-[0.98] text-white relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] uppercase font-bold mb-1 tracking-widest">Cash to Deposit</p>
                        <h3 className="text-[32px] font-bold tracking-tight">{formatCurrency(totalCashToDeposit)}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <FaMoneyBillWave className="text-2xl" />
                    </div>
                </div>
            </div>

            {/* Wallets Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Rider
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Earnings
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Available
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Cash Limit
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Bonuses
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Last Activity
                                </th>
                                <th className="px-8 py-5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {wallets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                                                <FaWallet className="text-2xl" />
                                            </div>
                                            <p className="text-gray-500 text-[14px] font-bold uppercase tracking-widest">No rider wallets found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                wallets.map((wallet) => (
                                    <tr key={wallet._id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-8 py-5">
                                            <div>
                                                <p className="font-bold text-[#111827] text-[15px] group-hover:text-orange-500 transition-colors">{wallet.rider?.name || 'Unknown'}</p>
                                                <p className="text-[12px] text-gray-400 font-medium mt-0.5">{wallet.rider?.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[#111827] font-bold text-[15px] tracking-tight">{formatCurrency(wallet.deliveryEarnings)}</span>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold uppercase tracking-widest border border-blue-100">
                                                        Base: {formatCurrency((wallet.rider?.stats?.completedDeliveries || 0) * 60)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[11px] font-bold tracking-tight border border-emerald-100">
                                                {formatCurrency(wallet.availableWithdraw)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-4 py-1.5 rounded-xl text-[11px] font-bold tracking-tight border ${wallet.cashToDeposit > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                                {formatCurrency(wallet.cashToDeposit)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-emerald-600 text-[13px] font-bold">+{formatCurrency(wallet.bonuses)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-gray-500 text-[12px] font-bold uppercase tracking-widest">{formatDate(wallet.lastWithdrawDate)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button className="p-2.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all active:scale-95" title="View History">
                                                    <FaHistory className="text-sm" />
                                                </button>
                                                {wallet.availableWithdraw > 0 && (
                                                    <button className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all">
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

