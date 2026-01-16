'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
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

            const res = await axios.get(`${API_BASE_URL}/api/finance/rider-wallets`, config);
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
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Total Active Riders</p>
                        <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{wallets.length}</h3>
                    </div>
                    <div className="bg-purple-50 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        <FaMotorcycle className="text-2xl" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Pending Withdrawals</p>
                        <h3 className="text-[26px] font-bold text-emerald-600 tracking-tight">{formatCurrency(totalPending)}</h3>
                    </div>
                    <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <FaWallet className="text-2xl" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Cash to Deposit</p>
                        <h3 className="text-[26px] font-bold text-red-600 tracking-tight">{formatCurrency(totalCashToDeposit)}</h3>
                    </div>
                    <div className="bg-red-50 w-14 h-14 rounded-2xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
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
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">
                                    Rider
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">
                                    Earnings
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">
                                    Available
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">
                                    Cash Limit
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">
                                    Bonuses
                                </th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">
                                    Last Activity
                                </th>
                                <th className="px-8 py-5 text-right text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {wallets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-[#9CA3AF]">
                                            <FaWallet className="text-3xl mb-3 opacity-20" />
                                            <p className="text-[14px] font-medium">No rider wallets found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                wallets.map((wallet) => (
                                    <tr key={wallet._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div>
                                                <p className="font-bold text-[#111827] text-[14px] group-hover:text-[#FF6A00] transition-colors">{wallet.rider?.name || 'Unknown'}</p>
                                                <p className="text-[12px] text-[#6B7280] mt-0.5">{wallet.rider?.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[#111827] font-bold text-[14px]">{formatCurrency(wallet.deliveryEarnings)}</span>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                        Base: {formatCurrency((wallet.rider?.stats?.completedDeliveries || 0) * 60)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-emerald-600 font-bold text-[14px]">{formatCurrency(wallet.availableWithdraw)}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[14px] font-bold ${wallet.cashToDeposit > 0 ? 'text-red-600' : 'text-[#6B7280]'}`}>
                                                {formatCurrency(wallet.cashToDeposit)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-emerald-600 text-[12px] font-bold">+{formatCurrency(wallet.bonuses)}</span>
                                                <span className="text-gray-300">/</span>
                                                <span className="text-red-600 text-[12px] font-bold">-{formatCurrency(wallet.penalties)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[#6B7280] text-[13px] font-medium">{formatDate(wallet.lastWithdrawDate)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-gray-100 text-[#6B7280] hover:text-[#FF6A00] rounded-xl transition-all flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider">
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
