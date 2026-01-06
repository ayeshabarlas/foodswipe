'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaDollarSign, FaStar, FaDownload, FaWallet, FaHistory } from 'react-icons/fa';

interface RiderEarningsProps {
    riderId: string;
}

export default function RiderEarnings({ riderId }: RiderEarningsProps) {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [earnings, setEarnings] = useState({
        total: 0,
        basePay: 0,
        bonuses: 0,
        tips: 0,
        deliveries: 0,
        pendingPayout: 0,
        nextPayoutDate: '-'
    });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        accountNumber: '',
        accountTitle: ''
    });
    const [isEditingBank, setIsEditingBank] = useState(false);
    const [savingBank, setSavingBank] = useState(false);

    React.useEffect(() => {
        // Fetch real earnings data
        const fetchEarnings = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}/earnings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setEarnings(res.data);
            } catch (error) {
                console.error('Error fetching earnings:', error);
            }
        };

        const fetchTransactions = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}/transactions`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTransactions(res.data);
            } catch (error) {
                console.error('Error fetching transactions:', error);
            }
        };

        const fetchRiderDetails = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.bankDetails) {
                    setBankDetails(res.data.bankDetails);
                }
            } catch (error) {
                console.error('Error fetching rider details:', error);
            }
        };

        fetchEarnings();
        fetchTransactions();
        fetchRiderDetails();

        const interval = setInterval(() => {
            fetchEarnings();
            fetchTransactions();
        }, 10000);

        return () => clearInterval(interval);
    }, [riderId]);

    const handleSaveBankDetails = async () => {
        setSavingBank(true);
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(`${API_BASE_URL}/api/riders/${riderId}/bank-details`, bankDetails, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditingBank(false);
        } catch (error) {
            console.error('Error updating bank details:', error);
            alert('Failed to update bank details');
        } finally {
            setSavingBank(false);
        }
    };

    const handleCashout = async () => {
        if (earnings.pendingPayout < 500) {
            alert('Minimum cashout amount is Rs. 500');
            return;
        }

        if (!bankDetails.accountNumber) {
            alert('Please add bank details first');
            setIsEditingBank(true);
            return;
        }

        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.post(`${API_BASE_URL}/api/riders/${riderId}/cashout`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Cashout request submitted successfully!');
            // Refresh data
            const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}/earnings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEarnings(res.data);
        } catch (error: any) {
            console.error('Cashout error:', error);
            alert(error.response?.data?.message || 'Failed to process cashout');
        }
    };

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 pt-8 pb-6 rounded-b-3xl text-white mb-6">
                <h1 className="text-2xl font-bold mb-2">Earnings</h1>
                <div className="flex items-end gap-2">
                    <h2 className="text-4xl font-bold">Rs. {earnings.total.toLocaleString()}</h2>
                    <p className="mb-2 opacity-90">this week</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Base Pay</p>
                    <p className="font-bold text-lg text-gray-900">Rs. {earnings.basePay.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Tips</p>
                    <p className="font-bold text-lg text-gray-900">Rs. {earnings.tips.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Deliveries</p>
                    <p className="font-bold text-lg text-gray-900">{earnings.deliveries}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Bonus</p>
                    <p className="font-bold text-lg text-gray-900">Rs. {earnings.bonuses.toLocaleString()}</p>
                </div>
            </div>

            {/* Payout Card */}
            <div className="px-6 mb-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <p className="text-gray-500 text-sm">Pending Payout</p>
                            <h3 className="text-2xl font-bold text-gray-900">Rs. {earnings.pendingPayout.toLocaleString()}</h3>
                        </div>
                        <button
                            onClick={handleCashout}
                            disabled={earnings.pendingPayout === 0}
                            className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cash Out
                        </button>
                    </div>
                    <div className="border-t border-gray-100 pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="font-semibold text-gray-900">Bank Account</p>
                            <button
                                onClick={() => setIsEditingBank(true)}
                                className="text-orange-500 text-sm font-semibold hover:text-orange-600"
                            >
                                Change
                            </button>
                        </div>
                        <p className="text-sm text-gray-600">{bankDetails.bankName || 'No Bank Added'} - **** {bankDetails.accountNumber ? bankDetails.accountNumber.slice(-4) : '0000'}</p>
                        <p className="text-xs text-gray-400 mt-1">{bankDetails.accountTitle || 'No Account Title'}</p>
                    </div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="px-6">
                <h3 className="font-bold text-gray-900 mb-4">Recent Transactions</h3>
                <div className="space-y-4">
                    {transactions.map((tx, index) => (
                        <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type.includes('tip') ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                    {tx.type.includes('tip') ? <FaWallet /> : <FaHistory />}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Order {tx.id}</p>
                                    <p className="text-xs text-gray-500">{tx.time}</p>
                                </div>
                            </div>
                            <p className="font-bold text-gray-900">+Rs. {tx.amount.toLocaleString()}</p>
                        </div>
                    ))}
                    {transactions.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No transactions yet</p>
                    )}
                </div>
            </div>

            {/* Bank Details Modal */}
            {isEditingBank && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Bank Details</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.bankName}
                                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="e.g. HBL, Meezan Bank"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Title</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountTitle}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountTitle: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Account Holder Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number / IBAN</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountNumber}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Account Number"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsEditingBank(false)}
                                className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveBankDetails}
                                disabled={savingBank}
                                className="flex-1 py-3 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50"
                            >
                                {savingBank ? 'Saving...' : 'Save Details'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
