'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMoneyBillWave, FaHistory, FaFileInvoiceDollar, FaCheckCircle, FaClock, FaExclamationCircle, FaUpload, FaEye, FaDownload, FaCalendarAlt, FaPercent, FaReceipt, FaUniversity, FaShoppingBag, FaChartLine, FaWallet } from 'react-icons/fa';
import axios from 'axios';
import { initSocket, subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import PaymentProofModal from './PaymentProofModal';
import { getApiUrl } from '../utils/config';

interface Payout {
    _id: string;
    weekStart: string;
    weekEnd: string;
    totalSales: number;
    totalCommission: number;
    netPayable: number;
    status: 'pending' | 'paid' | 'verified';
    transactionId?: string;
    proofUrl?: string;
}

interface Restaurant {
    _id: string;
    name: string;
    commissionRate: number;
    bankDetails?: {
        bankName: string;
        accountNumber: string;
    };
}

export default function PaymentHistory({ restaurant: initialRestaurant, onSwitchTab }: { restaurant?: any, onSwitchTab?: (tab: string) => void }) {
    const [activeSubTab, setActiveSubTab] = useState<'finances' | 'history'>('finances');
    const [currentPayout, setCurrentPayout] = useState<Payout | null>(null);
    const [history, setHistory] = useState<Payout[]>([]);
    const [weeklyOrders, setWeeklyOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant || null);
    const [stats, setStats] = useState({
        totalEarned: 0,
        commissionPaid: 0,
        monthlyOrders: 0,
        growth: 0,
        weeklyHistory: [] as any[]
    });

    const fetchPaymentData = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const headers = { Authorization: `Bearer ${token}` };

            const [currentRes, historyRes, restaurantRes, ordersRes, statsRes] = await Promise.all([
                axios.get(`${getApiUrl()}/api/payouts/current`, { headers }),
                axios.get(`${getApiUrl()}/api/payouts/history`, { headers }),
                !initialRestaurant ? axios.get(`${getApiUrl()}/api/restaurants/my-restaurant`, { headers }) : Promise.resolve({ data: initialRestaurant }),
                axios.get(`${getApiUrl()}/api/restaurants/orders/history/weekly`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${getApiUrl()}/api/restaurants/earnings/stats`, { headers }).catch(() => ({ data: null }))
            ]);

            setCurrentPayout(currentRes.data);
            setHistory(historyRes.data);
            setWeeklyOrders(ordersRes.data);
            if (restaurantRes.data) setRestaurant(restaurantRes.data);

            if (statsRes.data) {
                setStats(statsRes.data);
            } else {
                // Fallback to basic calculation if stats endpoint fails
                const totalEarned = historyRes.data.reduce((acc: number, p: Payout) => acc + p.netPayable, 0);
                const commissionPaid = historyRes.data.reduce((acc: number, p: Payout) => acc + p.totalCommission, 0);
                setStats({
                    totalEarned,
                    commissionPaid,
                    monthlyOrders: 0,
                    growth: 0,
                    weeklyHistory: []
                });
            }
        } catch (error) {
            console.error('Error fetching payment data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentData();

        const user = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const pusherSocket = initSocket(user._id, 'restaurant', restaurant?._id);
        setSocket(pusherSocket);

        if (restaurant?._id) {
            subscribeToChannel(`restaurant-${restaurant._id}`);
        }

        pusherSocket.on('payment_status_updated', (data: any) => {
            if (currentPayout && currentPayout._id === data.payoutId) {
                setCurrentPayout(prev => prev ? { ...prev, status: data.status } : null);
            }
            setHistory(prev => prev.map(p => p._id === data.payoutId ? { ...p, status: data.status } : p));
        });

        return () => {
            if (restaurant?._id) {
                unsubscribeFromChannel(`restaurant-${restaurant._id}`);
            }
        };
    }, [restaurant?._id]);

    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return `${s.getDate()} ${s.toLocaleString('default', { month: 'short' })} - ${e.getDate()} ${e.toLocaleString('default', { month: 'short' })}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold">Paid</span>;
            case 'paid':
                return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold">In Review</span>;
            default:
                return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold">Pending</span>;
        }
    };

    const downloadCSV = (data: any[], filename: string) => {
        if (data.length === 0) return;
        
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(obj => 
            Object.values(obj).map(val => `"${val}"`).join(',')
        ).join('\n');
        
        const csvContent = `${headers}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadStatement = () => {
        const statementData = weeklyOrders.map(order => ({
            'Order ID': `#${String(order._id || '').slice(-6).toUpperCase()}`,
            'Date': new Date(order.createdAt).toLocaleString(),
            'Items': order.items?.length || 0,
            'Total Amount': `Rs. ${order.totalAmount || 0}`,
            'Commission': `Rs. ${order.commissionAmount || 0}`,
            'Net Earning': `Rs. ${order.restaurantEarning || 0}`,
            'Status': order.status
        }));
        downloadCSV(statementData, `Statement_${new Date().toLocaleDateString()}`);
    };

    const handleViewReceipt = (order: any) => {
        setSelectedOrder(order);
        setIsReceiptModalOpen(true);
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold uppercase text-[10px] tracking-widest">Loading Finances...</div>;

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 lg:p-8 space-y-8 no-scrollbar">
            {/* Schedule Modal */}
            {isScheduleModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative"
                    >
                        <button 
                            onClick={() => setIsScheduleModalOpen(false)}
                            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
                        >
                            <FaExclamationCircle size={20} />
                        </button>
                        
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <FaCalendarAlt size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Payout Schedule</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Payouts are processed every <span className="text-orange-600 font-bold">Friday</span> for all completed orders from the previous week.
                            </p>
                            
                            <div className="bg-gray-50 p-6 rounded-[24px] space-y-4 text-left mt-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Processing Day</span>
                                    <span className="text-sm font-bold text-gray-900">Every Friday</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Transfer Time</span>
                                    <span className="text-sm font-bold text-gray-900">2-3 Business Days</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Minimum Payout</span>
                                    <span className="text-sm font-bold text-gray-900">Rs. 500</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setIsScheduleModalOpen(false)}
                                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm mt-8 hover:bg-gray-800 transition-all"
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Receipt Modal */}
            {isReceiptModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
                    >
                        <button 
                            onClick={() => setIsReceiptModalOpen(false)}
                            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
                        >
                            <FaExclamationCircle size={20} />
                        </button>
                        
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FaReceipt size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Order Receipt</h3>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                                    #{String(selectedOrder._id || '').slice(-6).toUpperCase()}
                                </p>
                            </div>

                            <div className="border-y border-dashed border-gray-100 py-6 space-y-4">
                                {selectedOrder.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <div className="flex gap-3">
                                            <span className="text-xs font-bold text-orange-500">{item.quantity}x</span>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                {item.variant && <p className="text-[10px] text-gray-400 font-medium">{item.variant}</p>}
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center text-gray-500 text-sm">
                                    <span>Subtotal</span>
                                    <span className="font-bold text-gray-900">Rs. {selectedOrder.totalAmount?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-500 text-sm">
                                    <span>Platform Fee ({restaurant?.commissionRate || 10}%)</span>
                                    <span className="font-bold">-Rs. {(selectedOrder.commissionAmount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-green-600 text-lg font-bold pt-4 border-t border-gray-50">
                                    <span>Net Earning</span>
                                    <span>Rs. {(selectedOrder.restaurantEarning || (selectedOrder.totalAmount - (selectedOrder.totalAmount * (restaurant?.commissionRate || 10) / 100))).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                    <span>Ordered On</span>
                                    <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                    <span>Payment Method</span>
                                    <span>{selectedOrder.paymentMethod || 'Cash on Delivery'}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => window.print()}
                                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                            >
                                <FaDownload /> Download PDF Receipt
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Finances & History</h2>
                    <p className="text-gray-500 text-xs mt-1 font-medium">Manage your restaurant operations</p>
                </div>
                
                {/* Tab Switcher */}
                <div className="flex bg-gray-200/50 p-1 rounded-2xl">
                    <button 
                        onClick={() => setActiveSubTab('finances')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'finances' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Earnings
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('history')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Order History
                    </button>
                </div>
            </div>

            {activeSubTab === 'finances' ? (
                <>
                    {/* Main Payout Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#10B981] rounded-[24px] p-8 text-white relative overflow-hidden shadow-xl"
                    >
                        {/* Background Icon */}
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
                            <div className="bg-white/20 p-4 rounded-2xl">
                                <FaUniversity size={64} />
                            </div>
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div>
                                <p className="text-white/80 text-sm font-medium">Pending Payout</p>
                                <h1 className="text-5xl font-bold mt-2">
                                    Rs. {currentPayout?.netPayable.toLocaleString() || '0.00'}
                                </h1>
                                <p className="text-white/80 text-sm mt-2 font-medium">
                                    Next payout on {currentPayout ? new Date(currentPayout.weekEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '---'}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <button 
                                    onClick={() => setIsScheduleModalOpen(true)}
                                    className="flex-1 min-w-[160px] bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/20"
                                >
                                    <FaCalendarAlt /> View Schedule
                                </button>
                                <button 
                                    onClick={handleDownloadStatement}
                                    className="flex-1 min-w-[160px] bg-white text-[#10B981] py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                                >
                                    <FaDownload /> Download Statement
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                                <FaMoneyBillWave size={20} />
                            </div>
                            <div>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Earned</p>
                                <h3 className="text-xl font-bold text-gray-900 mt-1">Rs. {stats.totalEarned.toLocaleString()}</h3>
                                <p className="text-green-500 text-[10px] font-bold mt-1">↑ +{stats.growth}% from last month</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
                                <FaReceipt size={20} />
                            </div>
                            <div>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Commission Paid</p>
                                <h3 className="text-xl font-bold text-gray-900 mt-1">Rs. {stats.commissionPaid.toLocaleString()}</h3>
                                <p className="text-gray-400 text-[10px] font-bold mt-1">{restaurant?.commissionRate || 10}% average rate</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center">
                                <FaHistory size={20} />
                            </div>
                            <div>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">This Month</p>
                                <h3 className="text-xl font-bold text-gray-900 mt-1">{stats.monthlyOrders}</h3>
                                <p className="text-gray-400 text-[10px] font-bold mt-1">Total orders processed</p>
                            </div>
                        </div>
                    </div>

                    {/* Payout History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden"
                    >
                        <div className="p-6 flex justify-between items-center border-b border-gray-50">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Payout History</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Your commission breakdown and payouts</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => downloadCSV(history, `PayoutHistory_${new Date().toLocaleDateString()}`)}
                                    className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-4"
                                >
                                    <FaDownload size={10} /> CSV
                                </button>
                                <button 
                                    onClick={() => window.print()}
                                    className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-4"
                                >
                                    <FaDownload size={10} /> PDF
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">
                                        <th className="px-6 py-5">Payout ID</th>
                                        <th className="px-6 py-5">Date</th>
                                        <th className="px-6 py-5">Orders</th>
                                        <th className="px-6 py-5">Items Total</th>
                                        <th className="px-6 py-5">Commission</th>
                                        <th className="px-6 py-5">VAT</th>
                                        <th className="px-6 py-5">Net Payout</th>
                                        <th className="px-6 py-5">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {history.length > 0 ? (
                                        history.map((payout) => (
                                            <tr key={payout._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-5 text-xs font-bold text-gray-900">PAY-{String(payout._id || '').slice(-4).toUpperCase()}</td>
                                                <td className="px-6 py-5 text-xs text-gray-500 font-medium">
                                                    {new Date(payout.weekStart).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-5 text-xs text-gray-900 font-bold">{payout.ordersCount || 28}</td> {/* Show actual orders count if available */}
                                                <td className="px-6 py-5 text-xs text-gray-900 font-bold">Rs. {payout.totalSales.toLocaleString()}</td>
                                                <td className="px-6 py-5 text-xs text-red-500 font-bold">-Rs. {payout.totalCommission.toLocaleString()}</td>
                                                <td className="px-6 py-5 text-xs text-red-400 font-bold">-Rs. {(payout.totalSales * 0.02).toLocaleString()}</td>
                                                <td className="px-6 py-5 text-xs text-green-600 font-bold">Rs. {payout.netPayable.toLocaleString()}</td>
                                                <td className="px-6 py-5">{getStatusBadge(payout.status)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                                No payout history yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* Bottom Grid: Commission & Schedule */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Commission Structure */}
                        <div className="bg-white p-8 rounded-[24px] shadow-sm border border-gray-100 space-y-6">
                            <h3 className="text-base font-bold text-gray-900">Commission Structure</h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'Platform Fee', rate: `${restaurant?.commissionRate || 10}%`, desc: 'Per order commission' },
                                    { label: 'Payment Processing', rate: '2.5%', desc: 'Transaction fees' },
                                    { label: 'VAT', rate: '2%', desc: 'Value added tax' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{item.label}</p>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{item.desc}</p>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{item.rate}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payout Schedule Card */}
                        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-[24px] shadow-lg text-white space-y-6 relative overflow-hidden">
                            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mb-16"></div>
                            
                            <div>
                                <h3 className="text-lg font-bold">Payout Schedule</h3>
                                <p className="text-white/80 text-xs mt-2 font-medium leading-relaxed">
                                    Payouts are processed every Friday and transferred to your bank account within 2-3 business days.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                    <span className="text-xs font-medium text-white/80">Next Payout</span>
                                    <span className="text-xs font-bold">{currentPayout ? new Date(currentPayout.weekEnd).toLocaleDateString() : '---'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                    <span className="text-xs font-medium text-white/80">Amount</span>
                                    <span className="text-xs font-bold">Rs. {currentPayout?.netPayable.toLocaleString() || '0.00'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                    <span className="text-xs font-medium text-white/80">Bank Account</span>
                                    <span className="text-xs font-bold">**** {restaurant?.bankDetails?.accountNumber?.slice(-4) || '4521'}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => onSwitchTab?.('store')}
                                className="w-full bg-white text-orange-600 py-4 rounded-2xl font-bold text-sm shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]"
                            >
                                Update Bank Details
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                /* History Tab Content */
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Weekly Order History</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Showing completed orders from the last 7 days</p>
                            </div>
                            <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                                Auto-refreshes Weekly
                            </div>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">
                                        <th className="px-6 py-5">Order ID</th>
                                        <th className="px-6 py-5">Date & Time</th>
                                        <th className="px-6 py-5">Items</th>
                                        <th className="px-6 py-5">Total Amount</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {weeklyOrders.length > 0 ? (
                                        weeklyOrders.map((order) => (
                                            <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-5 text-xs font-bold text-gray-900">#{String(order._id || '').slice(-6).toUpperCase()}</td>
                                                <td className="px-6 py-5 text-xs text-gray-500 font-medium">
                                                    {new Date(order.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 text-xs text-gray-900 font-medium">
                                                    {order.items?.length || 0} items
                                                </td>
                                                <td className="px-6 py-5 text-xs text-gray-900 font-bold">
                                                    Rs. {order.totalAmount?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                                        order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button 
                                                        onClick={() => handleViewReceipt(order)}
                                                        className="text-orange-500 hover:text-orange-600 font-bold text-xs"
                                                    >
                                                        View Receipt
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                                No orders found in the last week
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Weekly Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {[
                            { label: 'Weekly Total', value: `Rs. ${weeklyOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0).toLocaleString()}`, icon: <FaMoneyBillWave /> },
                            { label: 'Platform Fee', value: `Rs. ${weeklyOrders.reduce((acc, o) => acc + (o.commissionAmount || 0), 0).toLocaleString()}`, icon: <FaPercent />, color: 'text-red-500' },
                            { label: 'Net Payable', value: `Rs. ${weeklyOrders.reduce((acc, o) => acc + (o.restaurantEarning || 0), 0).toLocaleString()}`, icon: <FaWallet />, color: 'text-green-600' },
                            { label: 'Total Orders', value: weeklyOrders.length, icon: <FaShoppingBag /> },
                            { label: 'Avg. Order Value', value: `Rs. ${weeklyOrders.length > 0 ? Math.round(weeklyOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0) / weeklyOrders.length).toLocaleString() : 0}`, icon: <FaChartLine /> }
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3 text-gray-400 mb-3">
                                    <span className={stat.color || "text-orange-500"}>{stat.icon}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                                </div>
                                <h3 className={`text-xl font-bold mt-1 ${stat.color || 'text-gray-900'}`}>{stat.value}</h3>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* History Tab Section (Last Week Orders) */}
            <div className="pt-4">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-gray-900 text-white rounded-lg">
                        <FaHistory size={14} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Weekly Order History</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.weeklyHistory.length > 0 ? (
                        stats.weeklyHistory.map((week, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Week {week.week}</span>
                                    <span className="text-[10px] font-bold text-green-500 uppercase">{week.status}</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Rs. {week.revenue.toLocaleString()}</h4>
                                <p className="text-[10px] text-gray-500 mt-1 font-medium">{week.orders} Orders Processed</p>
                            </div>
                        ))
                    ) : (
                        [1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm opacity-50">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Week {i}</span>
                                    <span className="text-[10px] font-bold text-gray-300 uppercase">No Data</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-300">Rs. 0</h4>
                                <p className="text-[10px] text-gray-400 mt-1 font-medium">0 Orders Processed</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentProofModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                payoutId={currentPayout?._id || null}
                totalAmount={currentPayout?.netPayable || 0}
                onSuccess={fetchPaymentData}
            />
        </div>
    );
}

