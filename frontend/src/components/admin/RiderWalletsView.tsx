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
        return `Rs ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Rider Wallets</h1>
                <p className="text-gray-600 mt-1">Manage rider earnings and cash collections</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Riders</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{wallets.length}</p>
                        </div>
                        <FaMotorcycle className="text-purple-500 text-3xl" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Pending Withdrawals</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{formatCurrency(totalPending)}</p>
                        </div>
                        <FaWallet className="text-green-500 text-3xl" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Cash to Deposit</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{formatCurrency(totalCashToDeposit)}</p>
                        </div>
                        <FaMoneyBillWave className="text-red-500 text-3xl" />
                    </div>
                </div>
            </div>

            {/* Wallets Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rider
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Delivery Earnings
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Available Withdraw
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cash to Deposit
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bonuses/Penalties
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Withdrawal
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {wallets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        No rider wallets found
                                    </td>
                                </tr>
                            ) : (
                                wallets.map((wallet) => (
                                    <tr key={wallet._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{wallet.rider?.name || 'Unknown'}</p>
                                                <p className="text-sm text-gray-500">{wallet.rider?.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-900 font-semibold">{formatCurrency(wallet.deliveryEarnings)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-green-600 font-semibold">{formatCurrency(wallet.availableWithdraw)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={wallet.cashToDeposit > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                                {formatCurrency(wallet.cashToDeposit)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <span className="text-green-600">+{formatCurrency(wallet.bonuses)}</span>
                                                {' / '}
                                                <span className="text-red-600">-{formatCurrency(wallet.penalties)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-600 text-sm">{formatDate(wallet.lastWithdrawDate)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                                    <FaHistory className="text-xs" />
                                                    History
                                                </button>
                                                {wallet.availableWithdraw > 0 && (
                                                    <button className="text-green-600 hover:text-green-800 text-sm font-medium">
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
