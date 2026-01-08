'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaDollarSign, FaStar, FaDownload, FaWallet, FaHistory, FaArrowRight, FaUniversity } from 'react-icons/fa';

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
        nextPayoutDate: 'Friday, Dec 1'
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
        const fetchEarnings = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}/earnings?period=${period}`, {
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
    }, [riderId, period]);

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
            const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}/earnings?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEarnings(res.data);
        } catch (error: any) {
            console.error('Cashout error:', error);
            alert(error.response?.data?.message || 'Failed to process cashout');
        }
    };

    return (
        <div className="pb-24 bg-[#F8F9FB] min-h-screen">
            {/* Header */}
            <div className="bg-orange-500 px-6 pt-12 pb-20 rounded-b-[40px] text-white relative">
                <h1 className="text-xl font-medium mb-8">Earnings</h1>
                
                {/* Period Selector */}
                <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl mb-10">
                    <button 
                        onClick={() => setPeriod('daily')}
                        className={`flex-1 py-2 rounded-xl text-sm transition-all ${period === 'daily' ? 'bg-white text-orange-500 font-medium' : 'text-white'}`}
                    >
                        Daily
                    </button>
                    <button 
                        onClick={() => setPeriod('weekly')}
                        className={`flex-1 py-2 rounded-xl text-sm transition-all ${period === 'weekly' ? 'bg-white text-orange-500 font-medium' : 'text-white'}`}
                    >
                        Weekly
                    </button>
                    <button 
                        onClick={() => setPeriod('monthly')}
                        className={`flex-1 py-2 rounded-xl text-sm transition-all ${period === 'monthly' ? 'bg-white text-orange-500 font-medium' : 'text-white'}`}
                    >
                        Monthly
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-white/70 text-xs mb-2 uppercase tracking-widest">Total This {period.charAt(0).toUpperCase() + period.slice(1)}</p>
                    <h2 className="text-5xl font-bold mb-2">PKR {earnings.total.toLocaleString()}</h2>
                    <p className="text-white/80 text-sm font-light">{earnings.deliveries} deliveries completed</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 -mt-12 grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white p-4 rounded-3xl shadow-lg shadow-gray-100 flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white mb-2 shadow-md shadow-blue-100">
                        <FaDollarSign size={16} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-medium mb-1">Base Pay</p>
                    <p className="font-bold text-sm text-gray-900">{earnings.basePay.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-lg shadow-gray-100 flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white mb-2 shadow-md shadow-purple-100">
                        <FaStar size={16} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-medium mb-1">Bonuses</p>
                    <p className="font-bold text-sm text-gray-900">{earnings.bonuses.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-lg shadow-gray-100 flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-white mb-2 shadow-md shadow-yellow-100">
                        <FaWallet size={16} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-medium mb-1">Tips</p>
                    <p className="font-bold text-sm text-gray-900">{earnings.tips.toLocaleString()}</p>
                </div>
            </div>

            {/* Payout Card */}
            <div className="px-6 mb-8">
                <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 rounded-[32px] p-6 text-white shadow-xl shadow-orange-100 relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] opacity-10">
                        <FaWallet size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-white/70 text-sm font-light mb-1">Pending Payout</p>
                                <h3 className="text-3xl font-bold">PKR {earnings.pendingPayout.toLocaleString()}</h3>
                            </div>
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                <FaWallet size={24} />
                            </div>
                        </div>
                        <div className="flex justify-between items-end mt-8">
                            <p className="text-white/80 text-xs">Next payout: <span className="font-medium">{earnings.nextPayoutDate}</span></p>
                            <button
                                onClick={handleCashout}
                                className="bg-white/20 backdrop-blur-md text-white px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/30 transition border border-white/30"
                            >
                                Cash Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Account Section */}
            <div className="px-6 mb-8">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4 px-1">Bank Account</p>
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                            <FaUniversity size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-gray-900 font-bold text-sm tracking-tight">
                                {bankDetails.bankName || 'Add Bank Account'}
                            </p>
                            <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mt-0.5">
                                **** {bankDetails.accountNumber ? bankDetails.accountNumber.slice(-4) : 'XXXX'} • {bankDetails.accountTitle || 'No title set'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsEditingBank(true)}
                        className="text-orange-500 text-[10px] font-bold uppercase tracking-widest hover:bg-orange-50 px-4 py-2 rounded-xl transition-all"
                    >
                        Change
                    </button>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="px-6">
                <div className="flex justify-between items-center mb-4 px-1">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Recent Transactions</p>
                    <button className="text-orange-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                        View All <FaArrowRight size={10} />
                    </button>
                </div>
                <div className="space-y-3">
                    {transactions.length > 0 ? transactions.map((tx, index) => (
                        <div key={index} className="bg-white p-4 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                    <FaDollarSign size={18} />
                                </div>
                                <div>
                                    <p className="text-gray-900 font-bold text-sm tracking-tight">#{tx.id?.slice(-5) || '12345'}</p>
                                    <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mt-0.5">{tx.time || 'Today, 2:30 PM'}</p>
                                </div>
                            </div>
                            <p className="text-green-600 font-bold text-sm">+PKR {tx.amount.toLocaleString()}</p>
                        </div>
                    )) : (
                        <div className="bg-white p-10 rounded-[32px] border border-dashed border-gray-200 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaHistory className="text-gray-200" size={24} />
                            </div>
                            <p className="text-gray-400 text-xs font-medium">No transactions found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bank Details Modal */}
            {isEditingBank && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
                    <div className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-slide-up">
                        <div className="w-12 h-1 bg-gray-100 rounded-full mx-auto mb-8 sm:hidden"></div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">Bank Details</h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.bankName}
                                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                                    placeholder="e.g. HBL, Meezan Bank"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Account Title</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountTitle}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountTitle: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                                    placeholder="Account Holder Name"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Account Number / IBAN</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountNumber}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                                    placeholder="Account Number"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsEditingBank(false)}
                                className="flex-1 py-4 rounded-2xl font-bold text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveBankDetails}
                                disabled={savingBank}
                                className="flex-1 py-4 rounded-2xl font-bold text-white bg-orange-500 shadow-lg shadow-orange-100 hover:scale-[1.02] transition-all active:scale-[0.98] text-xs uppercase tracking-widest"
                            >
                                {savingBank ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
