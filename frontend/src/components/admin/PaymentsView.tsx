'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaCheckCircle } from 'react-icons/fa';

export default function PaymentsView() {
    const [payouts, setPayouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayouts();

        const socket = io(SOCKET_URL);
        socket.on('order_updated', fetchPayouts); // Orders affect payouts
        socket.on('stats_updated', fetchPayouts); // Global stats update affects payouts
        
        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchPayouts = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            const { data } = await axios.get(`${API_BASE_URL}/api/payouts/all`, config);
            setPayouts(data);
        } catch (error) {
            console.error('Error fetching payouts:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex flex-col gap-8">
                {/* Header Section */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-[24px] font-bold text-[#111827] tracking-tight mb-1">
                            Pending Payouts
                        </h1>
                        <p className="text-[#6B7280] text-[14px]">
                            Manage and process payouts for restaurants and riders
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#FF6A00] text-white rounded-xl font-bold hover:bg-[#e65f00] shadow-lg shadow-[#FF6A00]/20 transition-all active:scale-95 text-[12px] uppercase tracking-wider">
                        Process Batch Payout
                    </button>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Type</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Name</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Amount</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Due Date</th>
                                    <th className="px-8 py-5 text-right text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payouts.length > 0 ? (
                                    payouts.map(payout => (
                                        <tr key={payout._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${payout.type === 'restaurant' 
                                                    ? 'bg-orange-50 text-[#FF6A00]' 
                                                    : 'bg-blue-50 text-blue-600'}`}>
                                                    {payout.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="font-bold text-[#111827] text-[14px] group-hover:text-[#FF6A00] transition-colors">
                                                    {payout.entityName || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="font-bold text-[#111827] text-[15px]">
                                                    Rs. {payout.totalAmount?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${payout.status === 'paid' 
                                                    ? 'bg-emerald-50 text-emerald-600' 
                                                    : 'bg-amber-50 text-amber-600'}`}>
                                                    {payout.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[#6B7280] text-[13px] font-medium">
                                                    {new Date(payout.weekEnd).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button className="px-4 py-2 bg-emerald-500 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-600 shadow-sm transition-all active:scale-95 uppercase tracking-wider">
                                                    Pay Now
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                                    <FaCheckCircle className="text-xl" />
                                                </div>
                                                <p className="text-[#6B7280] font-medium text-[14px]">No pending payouts found</p>
                                                <p className="text-[#9CA3AF] text-[12px]">All payments are up to date</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
