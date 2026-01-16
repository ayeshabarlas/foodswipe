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
                        <h1 className="text-[32px] font-bold text-[#111827] tracking-tight mb-2">
                            Pending Payouts
                        </h1>
                        <p className="text-gray-500 text-[16px] font-medium">
                            Manage and process payouts for restaurants and riders
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-500/20 transition-all active:scale-95 text-[13px] uppercase tracking-widest shadow-lg">
                        Process Batch Payout
                    </button>
                </div>

                {/* Stats Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-8 rounded-[2rem] shadow-xl shadow-orange-500/10 text-white relative overflow-hidden group active:scale-[0.98] transition-all">
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        <div className="relative z-10">
                            <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Total Pending</p>
                            <h3 className="text-[32px] font-bold tracking-tight">
                                Rs. {payouts.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="relative z-10 mt-4 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                            <FaCheckCircle className="text-2xl" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 rounded-[2rem] shadow-xl shadow-blue-500/10 text-white relative overflow-hidden group active:scale-[0.98] transition-all">
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        <div className="relative z-10">
                            <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Restaurants</p>
                            <h3 className="text-[32px] font-bold tracking-tight">
                                Rs. {payouts.filter(p => p.type === 'restaurant').reduce((acc, curr) => acc + (curr.totalAmount || 0), 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="relative z-10 mt-4 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                            <FaCheckCircle className="text-2xl" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2rem] shadow-xl shadow-emerald-500/10 text-white relative overflow-hidden group active:scale-[0.98] transition-all">
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        <div className="relative z-10">
                            <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Riders</p>
                            <h3 className="text-[32px] font-bold tracking-tight">
                                Rs. {payouts.filter(p => p.type === 'rider').reduce((acc, curr) => acc + (curr.totalAmount || 0), 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="relative z-10 mt-4 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                            <FaCheckCircle className="text-2xl" />
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Type</th>
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Name</th>
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Amount</th>
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Due Date</th>
                                    <th className="px-8 py-6 text-right text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payouts.length > 0 ? (
                                    payouts.map(payout => (
                                        <tr key={payout._id} className="hover:bg-gray-50/50 transition-all group">
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${payout.type === 'restaurant' 
                                                    ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                                    : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                    {payout.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="font-bold text-[#111827] text-[15px] group-hover:text-orange-500 transition-colors">
                                                    {payout.entityName || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="font-bold text-[#111827] text-[17px]">
                                                    Rs. {payout.totalAmount?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${payout.status === 'paid' 
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                    : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {payout.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-gray-500 text-[14px] font-bold">
                                                    {new Date(payout.weekEnd).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[11px] font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-95 uppercase tracking-widest">
                                                    Pay Now
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 rounded-[2rem] bg-gray-50 flex items-center justify-center text-[#9CA3AF] border border-gray-100">
                                                    <FaCheckCircle className="text-3xl" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[#111827] font-bold text-[18px]">No pending payouts found</p>
                                                    <p className="text-[#9CA3AF] text-[14px]">All payments are up to date and processed</p>
                                                </div>
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
