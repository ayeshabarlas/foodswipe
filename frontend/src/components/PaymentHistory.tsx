'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMoneyBillWave, FaHistory, FaFileInvoiceDollar, FaCheckCircle, FaClock, FaExclamationCircle, FaUpload, FaEye, FaDownload, FaCalendarAlt, FaPercent, FaReceipt, FaUniversity } from 'react-icons/fa';
import axios from 'axios';
import { io } from 'socket.io-client';
import PaymentProofModal from './PaymentProofModal';
import { API_BASE_URL, SOCKET_URL } from '../utils/config';

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

export default function PaymentHistory({ restaurant: initialRestaurant }: { restaurant?: any }) {
    const [currentPayout, setCurrentPayout] = useState<Payout | null>(null);
    const [history, setHistory] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [socket, setSocket] = useState<any>(null);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant || null);
    const [stats, setStats] = useState({
        totalEarned: 0,
        commissionPaid: 0,
        monthlyOrders: 0,
        growth: 0
    });

    const fetchPaymentData = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const headers = { Authorization: `Bearer ${token}` };

            const [currentRes, historyRes, restaurantRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/payouts/current`, { headers }),
                axios.get(`${API_BASE_URL}/api/payouts/history`, { headers }),
                !initialRestaurant ? axios.get(`${API_BASE_URL}/api/restaurants/my-restaurant`, { headers }) : Promise.resolve({ data: initialRestaurant })
            ]);

            setCurrentPayout(currentRes.data);
            setHistory(historyRes.data);
            if (restaurantRes.data) setRestaurant(restaurantRes.data);

            // Calculate aggregate stats from history
            const totalEarned = historyRes.data.reduce((acc: number, p: Payout) => acc + p.netPayable, 0);
            const commissionPaid = historyRes.data.reduce((acc: number, p: Payout) => acc + p.totalCommission, 0);
            
            // This month's orders (simulated for UI)
            setStats({
                totalEarned,
                commissionPaid,
                monthlyOrders: 163, // Placeholder
                growth: 12.5
            });
        } catch (error) {
            console.error('Error fetching payment data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentData();

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        if (restaurant?._id) {
            newSocket.emit('join_restaurant', restaurant._id);
        }

        newSocket.on('payment_status_updated', (data: any) => {
            if (currentPayout && currentPayout._id === data.payoutId) {
                setCurrentPayout(prev => prev ? { ...prev, status: data.status } : null);
            }
            setHistory(prev => prev.map(p => p._id === data.payoutId ? { ...p, status: data.status } : p));
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

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

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold uppercase text-[10px] tracking-widest">Loading Finances...</div>;

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 lg:p-8 space-y-8 no-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Finances</h2>
                    <p className="text-gray-500 text-xs mt-1 font-medium">Manage your restaurant operations</p>
                </div>
            </div>

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
                        <button className="flex-1 min-w-[160px] bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/20">
                            <FaCalendarAlt /> View Schedule
                        </button>
                        <button className="flex-1 min-w-[160px] bg-white text-[#10B981] py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95">
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
                        <FaChartLine size={20} />
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
                        <button className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-4">
                            <FaDownload size={10} /> CSV
                        </button>
                        <button className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-4">
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
                                        <td className="px-6 py-5 text-xs font-bold text-gray-900">PAY-{payout._id.slice(-4).toUpperCase()}</td>
                                        <td className="px-6 py-5 text-xs text-gray-500 font-medium">
                                            {new Date(payout.weekStart).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-900 font-bold">28</td> {/* Placeholder count */}
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

                {/* Payout Schedule Card (The Orange One) */}
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

                    <button className="w-full bg-white text-orange-600 py-4 rounded-2xl font-bold text-sm shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]">
                        Update Bank Details
                    </button>
                </div>
            </div>

            {/* History Tab Section (Last Week Orders) */}
            <div className="pt-4">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-gray-900 text-white rounded-lg">
                        <FaHistory size={14} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Weekly Order History</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Placeholder for weekly history cards */}
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Week {i}</span>
                                <span className="text-[10px] font-bold text-green-500 uppercase">Delivered</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Rs. {(Math.random() * 15000 + 5000).toLocaleString()}</h4>
                            <p className="text-[10px] text-gray-500 mt-1 font-medium">42 Orders Processed</p>
                        </div>
                    ))}
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
