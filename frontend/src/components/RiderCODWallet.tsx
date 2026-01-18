import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaWallet, FaHistory, FaArrowUp, FaClock, FaCheckCircle, FaExclamationTriangle, FaLock } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import toast from 'react-hot-toast';

interface LedgerEntry {
    _id: string;
    order: {
        orderNumber: string;
        totalPrice: number;
        createdAt: string;
    };
    cod_collected: number;
    rider_earning: number;
    admin_balance: number;
    status: 'pending' | 'paid';
    createdAt: string;
}

interface RiderCODWalletProps {
    rider: any;
    token: string;
    onRefresh: () => void;
}

const RiderCODWallet: React.FC<RiderCODWalletProps> = ({ rider, token, onRefresh }) => {
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [requestingPayout, setRequestingPayout] = useState(false);

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const response = await axios.get(`${API_BASE_URL}/api/riders/me/ledger`, config);
            setLedger(response.data);
        } catch (error) {
            console.error('Error fetching ledger:', error);
            toast.error('Failed to load transaction history');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async () => {
        if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (parseFloat(payoutAmount) > (rider?.earnings_balance || 0)) {
            toast.error('Insufficient earnings balance');
            return;
        }

        setRequestingPayout(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            await axios.post(`${API_BASE_URL}/api/riders/me/request-payout`, {
                amount: parseFloat(payoutAmount),
                notes: 'Manual payout request from app'
            }, config);
            
            toast.success('Payout request submitted successfully!');
            setPayoutAmount('');
            onRefresh();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to request payout');
        } finally {
            setRequestingPayout(false);
        }
    };

    const totalCOD = rider?.cod_balance || 0;
    const totalEarnings = rider?.earnings_balance || 0;
    const status = rider?.settlementStatus || 'active';
    const limit = 20000;
    const progress = Math.min((totalCOD / limit) * 100, 100);

    // Calculate breakdown from pending ledger entries
    const pendingLedger = ledger.filter(entry => entry.status === 'pending');
    const totalRiderFeeFromLedger = pendingLedger.reduce((sum, entry) => sum + entry.rider_earning, 0);
    const netPayableToAdmin = pendingLedger.reduce((sum, entry) => sum + entry.admin_balance, 0);

    return (
        <div className="space-y-6 pb-20">
            {/* Wallet Header */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <FaWallet size={120} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total COD Collected</p>
                            <h2 className="text-4xl font-bold">Rs. {totalCOD.toLocaleString()}</h2>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                            status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            status === 'overdue' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                            <div className={`w-2 h-2 rounded-full animate-pulse ${
                                status === 'active' ? 'bg-green-400' :
                                status === 'overdue' ? 'bg-orange-400' :
                                'bg-red-400'
                            }`} />
                            {status}
                        </div>
                    </div>

                    {/* COD Breakdown */}
                    <div className="grid grid-cols-2 gap-4 mb-8 py-4 border-y border-white/5">
                        <div>
                            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Rider Fee</p>
                            <p className="text-lg font-bold text-green-400">Rs. {totalRiderFeeFromLedger.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Net to Admin</p>
                            <p className="text-lg font-bold text-orange-400">Rs. {netPayableToAdmin.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-medium">
                            <span className="text-gray-400 uppercase tracking-widest">COD Limit (Rs. 20,000)</span>
                            <span className={`${progress > 80 ? 'text-red-400' : 'text-gray-400'}`}>{Math.round(progress)}% Used</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className={`h-full rounded-full ${
                                    progress > 80 ? 'bg-gradient-to-r from-red-500 to-pink-500' : 
                                    progress > 50 ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                    'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}
                            />
                        </div>
                        {status === 'overdue' && (
                            <p className="text-[10px] text-orange-400 flex items-center gap-2 font-medium">
                                <FaExclamationTriangle /> Please settle with admin to avoid being blocked
                            </p>
                        )}
                        {status === 'blocked' && (
                            <p className="text-[10px] text-red-400 flex items-center gap-2 font-medium">
                                <FaLock /> Account blocked due to overdue COD. Contact admin.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Earnings Card */}
            <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Available Earnings</p>
                        <h3 className="text-2xl font-bold text-gray-900">Rs. {totalEarnings.toLocaleString()}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                        <FaArrowUp />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <input 
                            type="number" 
                            placeholder="Enter amount to withdraw"
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleRequestPayout}
                        disabled={requestingPayout || totalEarnings <= 0}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {requestingPayout ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <FaClock /> Request Payout
                            </>
                        )}
                    </button>
                    <p className="text-[9px] text-gray-400 text-center font-medium uppercase tracking-widest">
                        Payouts are processed within 24-48 hours
                    </p>
                </div>
            </div>

            {/* Transaction History */}
            <div className="px-2">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                        <FaHistory className="text-orange-500" size={16} />
                        Recent History
                    </h3>
                    <button onClick={fetchLedger} className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">Refresh</button>
                </div>

                <div className="space-y-3">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-100 rounded-[30px] animate-pulse" />
                        ))
                    ) : ledger.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">No transactions yet</p>
                        </div>
                    ) : (
                        ledger.map((entry) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={entry._id} 
                                className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-100 flex justify-between items-center"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                        entry.status === 'paid' ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'
                                    }`}>
                                        {entry.status === 'paid' ? <FaCheckCircle /> : <FaClock />}
                                    </div>
                                    <div>
                                        <p className="text-gray-900 font-bold text-sm">Order #{entry.order?.orderNumber || entry.order?._id?.slice(-6).toUpperCase()}</p>
                                        <p className="text-gray-400 text-[10px] font-medium">{new Date(entry.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-900 font-bold text-sm">Rs. {entry.cod_collected.toLocaleString()}</p>
                                    <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest">Earned: Rs. {entry.rider_earning}</p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default RiderCODWallet;
