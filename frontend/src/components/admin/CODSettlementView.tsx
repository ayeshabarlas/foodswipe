'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import toast from 'react-hot-toast';
import { 
    FaMotorcycle, FaSearch, FaFilter, FaMoneyBillWave, 
    FaCheckCircle, FaBan, FaHistory, FaClock, 
    FaExclamationTriangle, FaUniversity, FaArrowRight
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface Rider {
    _id: string;
    fullName: string;
    user: {
        name: string;
        phone: string;
        email: string;
    };
    cod_balance: number;
    earnings_balance: number;
    settlementStatus: 'active' | 'overdue' | 'blocked';
    lastSettlementDate: string;
}

interface Transaction {
    _id: string;
    rider: { fullName: string };
    order: { orderNumber: string, totalPrice: number };
    cod_collected: number;
    rider_earning: number;
    admin_balance: number;
    status: string;
    createdAt: string;
}

export default function CODSettlementView() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [settlingRider, setSettlingRider] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            const response = await axios.get(`${API_BASE_URL}/api/admin/cod-ledger`, config);
            setRiders(response.data.riders || []);
            setPendingTransactions(response.data.pendingTransactions || []);
        } catch (error) {
            console.error('Error fetching COD data:', error);
            toast.error('Failed to load settlement data');
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = async (riderId: string) => {
        if (!confirm('Are you sure you want to mark this rider as settled? This will reset their COD balance.')) return;

        try {
            setSettlingRider(riderId);
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            await axios.post(`${API_BASE_URL}/api/admin/settle-rider`, { 
                riderId,
                amountCollected: riders.find(r => r._id === riderId)?.cod_balance,
                earningsPaid: 0 // In a real scenario, you might allow partial payment
            }, config);
            
            toast.success('Rider settled successfully');
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Settlement failed');
        } finally {
            setSettlingRider(null);
        }
    };

    const handleToggleBlock = async (riderId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        if (!confirm(`Are you sure you want to ${newStatus} this rider?`)) return;

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            await axios.post(`${API_BASE_URL}/api/admin/riders/${riderId}/block`, { status: newStatus }, config);
            toast.success(`Rider ${newStatus} successfully`);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const filteredRiders = riders.filter(rider => 
        (rider.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rider.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rider.user?.phone?.includes(searchTerm))
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                            <FaMoneyBillWave size={20} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total COD in Market</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                Rs. {riders.reduce((acc, r) => acc + (r.cod_balance || 0), 0).toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                            <FaExclamationTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Overdue Riders</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {riders.filter(r => r.settlementStatus === 'overdue').length}
                            </h3>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                            <FaCheckCircle size={20} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Pending Payouts</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                Rs. {riders.reduce((acc, r) => acc + (r.earnings_balance || 0), 0).toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">COD Settlement</h2>
                        <p className="text-gray-400 text-sm">Monitor and settle rider cash collections</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search riders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 transition-all w-64"
                            />
                        </div>
                        <button onClick={fetchData} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-orange-500 transition-colors">
                            <FaHistory />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rider</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">COD Collected</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rider Fee</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Net</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Settlement</th>
                                <th className="px-8 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredRiders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-12 text-center text-gray-400">No riders found</td>
                                </tr>
                            ) : (
                                filteredRiders.map((rider) => {
                                    // Calculate breakdown for this rider from pending transactions
                                    const riderPendingTx = pendingTransactions.filter(tx => 
                                        (typeof tx.rider === 'object' && tx.rider?._id === rider._id) || 
                                        (typeof tx.rider === 'string' && tx.rider === rider._id)
                                    );
                                    const totalRiderFee = riderPendingTx.reduce((acc, tx) => acc + (tx.rider_earning || 0), 0);
                                    const totalAdminNet = riderPendingTx.reduce((acc, tx) => acc + (tx.admin_balance || 0), 0);

                                    return (
                                        <tr key={rider._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold">
                                                        {rider.fullName?.charAt(0) || rider.user?.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{rider.fullName || rider.user?.name}</p>
                                                        <p className="text-[10px] text-gray-400">{rider.user?.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className={`text-sm font-bold ${rider.cod_balance > 15000 ? 'text-red-500' : 'text-gray-900'}`}>
                                                    Rs. {rider.cod_balance?.toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-bold text-green-600">
                                                    Rs. {totalRiderFee.toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-bold text-blue-600">
                                                    Rs. {totalAdminNet.toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                    rider.settlementStatus === 'active' ? 'bg-green-50 text-green-600' :
                                                    rider.settlementStatus === 'overdue' ? 'bg-orange-50 text-orange-600' :
                                                    'bg-red-50 text-red-600'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        rider.settlementStatus === 'active' ? 'bg-green-500' :
                                                        rider.settlementStatus === 'overdue' ? 'bg-orange-500' :
                                                        'bg-red-500'
                                                    }`} />
                                                    {rider.settlementStatus}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs text-gray-500">
                                                    {rider.lastSettlementDate ? new Date(rider.lastSettlementDate).toLocaleDateString() : 'Never'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleSettle(rider._id)}
                                                        disabled={settlingRider === rider._id || rider.cod_balance === 0}
                                                        className="px-4 py-2 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50"
                                                    >
                                                        {settlingRider === rider._id ? '...' : 'Settle'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleBlock(rider._id, rider.settlementStatus)}
                                                        className={`p-2 rounded-xl transition-all ${
                                                            rider.settlementStatus === 'blocked' 
                                                            ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                        }`}
                                                        title={rider.settlementStatus === 'blocked' ? 'Unblock' : 'Block'}
                                                    >
                                                        {rider.settlementStatus === 'blocked' ? <FaCheckCircle /> : <FaBan />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pending Transactions Section */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">Pending Ledger Entries</h2>
                    <p className="text-gray-400 text-sm">Detailed list of unpaid COD orders</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rider</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order #</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Collected</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Earning</th>
                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Net</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr className="animate-pulse">
                                    <td colSpan={6} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                                </tr>
                            ) : pendingTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-12 text-center text-gray-400 uppercase text-[10px] tracking-widest font-bold">No pending transactions</td>
                                </tr>
                            ) : (
                                pendingTransactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-4 text-xs text-gray-500">
                                            {new Date(tx.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-medium text-gray-900">
                                            {tx.rider?.fullName}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-bold text-orange-500">
                                            #{tx.order?.orderNumber}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-bold text-gray-900">
                                            Rs. {tx.cod_collected}
                                        </td>
                                        <td className="px-8 py-4 text-sm text-green-600 font-medium">
                                            Rs. {tx.rider_earning}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-bold text-blue-600">
                                            Rs. {tx.admin_balance}
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
