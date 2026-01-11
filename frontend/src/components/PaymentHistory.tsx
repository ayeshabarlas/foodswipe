'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMoneyBillWave, FaHistory, FaFileInvoiceDollar, FaCheckCircle, FaClock, FaExclamationCircle, FaUpload, FaEye } from 'react-icons/fa';
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
}

export default function PaymentHistory({ restaurant: initialRestaurant }: { restaurant?: any }) {
    const [currentPayout, setCurrentPayout] = useState<Payout | null>(null);
    const [history, setHistory] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [socket, setSocket] = useState<any>(null);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant || null);

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
        } catch (error) {
            console.error('Error fetching payment data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentData();

        // Socket.io connection
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        if (restaurant?._id) {
            newSocket.emit('join_restaurant', restaurant._id);
        }

        newSocket.on('payment_status_updated', (data: any) => {
            // Update local state immediately
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
                return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FaCheckCircle /> Verified</span>;
            case 'paid':
                return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FaClock /> Under Review</span>;
            default:
                return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FaExclamationCircle /> Pending</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading payment history...</div>;

    return (
        <div className="p-6 space-y-8 max-w-7xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
                <p className="text-gray-500 text-sm">Manage your weekly payouts and view transaction history</p>
            </div>

            {/* Current Week Bill */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                <FaFileInvoiceDollar className="text-xl" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">Current Week Bill</h3>
                        </div>
                        <p className="text-gray-500 text-sm mb-4">
                            {currentPayout ? formatDateRange(currentPayout.weekStart, currentPayout.weekEnd) : 'No active period'}
                        </p>

                        <div className="flex gap-8">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Total Sales</p>
                                <p className="text-xl font-bold text-gray-900">Rs. {currentPayout?.totalSales.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Commission ({restaurant?.commissionRate || 15}%)</p>
                                <p className="text-xl font-bold text-red-500">-Rs. {currentPayout?.totalCommission.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Net Payable</p>
                                <p className="text-xl font-bold text-green-600">Rs. {currentPayout?.netPayable.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <div className="mb-2">
                            {currentPayout ? getStatusBadge(currentPayout.status) : getStatusBadge('pending')}
                        </div>

                        {currentPayout && currentPayout.status === 'pending' && currentPayout.netPayable > 0 && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition flex items-center gap-2"
                            >
                                <FaUpload /> Pay Now & Upload Proof
                            </button>
                        )}

                        {currentPayout && currentPayout.status !== 'pending' && (
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                <FaCheckCircle className="text-green-500" /> Proof Submitted
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Previous Payments Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FaHistory className="text-gray-400" /> Previous Payments
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Week</th>
                                <th className="px-6 py-4">Sales</th>
                                <th className="px-6 py-4">Commission</th>
                                <th className="px-6 py-4">Net Payable</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.length > 0 ? (
                                history.map((payout) => (
                                    <tr key={payout._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {formatDateRange(payout.weekStart, payout.weekEnd)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">Rs. {payout.totalSales.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-red-500">-Rs. {payout.totalCommission.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-green-600">Rs. {payout.netPayable.toFixed(2)}</td>
                                        <td className="px-6 py-4">{getStatusBadge(payout.status)}</td>
                                        <td className="px-6 py-4">
                                            {payout.proofUrl ? (
                                                <a
                                                    href={`${API_BASE_URL}${payout.proofUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <FaEye /> View
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                                        No payment history available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

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
