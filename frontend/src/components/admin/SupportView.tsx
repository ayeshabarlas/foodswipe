'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaHeadset, FaSearch, FaFilter, FaClock, FaCheck, FaExclamationCircle } from 'react-icons/fa';

export default function SupportView() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();

        const socket = io(SOCKET_URL);
        socket.on('ticket_created', fetchTickets);
        socket.on('ticket_updated', fetchTickets);

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchTickets = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            const { data } = await axios.get(`${API_BASE_URL}/api/tickets`, config);
            setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        refunds: tickets.filter(t => t.subject?.toLowerCase().includes('refund')).length,
        resolved: tickets.filter(t => t.status === 'resolved').length
    };

    const getPriorityColor = (p: string) => {
        if (p === 'HIGH') return 'bg-red-100 text-red-600 border-red-200';
        if (p === 'MEDIUM') return 'bg-orange-100 text-orange-600 border-orange-200';
        return 'bg-blue-100 text-blue-600 border-blue-200';
    };

    const getStatusBadge = (s: string) => {
        if (s === 'open') return 'bg-orange-100 text-orange-600';
        if (s === 'investigating') return 'bg-blue-100 text-blue-600';
        return 'bg-green-100 text-green-600';
    };

    return (
        <div className="p-8">
            <div className="mb-10">
                <h2 className="text-[32px] font-bold text-[#111827] tracking-tight">Support & Tickets</h2>
                <p className="text-[16px] font-medium text-[#6B7280] mt-2">Manage customer support, refunds, and disputes</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 rounded-[2rem] shadow-xl shadow-blue-500/10 text-white relative overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Total Tickets</p>
                        <h3 className="text-[32px] font-bold tracking-tight">{stats.total}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <FaHeadset className="text-2xl" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-8 rounded-[2rem] shadow-xl shadow-orange-500/10 text-white relative overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Open Tickets</p>
                        <h3 className="text-[32px] font-bold tracking-tight">{stats.open}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <FaClock className="text-2xl" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-pink-600 p-8 rounded-[2rem] shadow-xl shadow-red-500/10 text-white relative overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Refund Requests</p>
                        <h3 className="text-[32px] font-bold tracking-tight">{stats.refunds}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform font-bold text-2xl">Rs</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2rem] shadow-xl shadow-emerald-500/10 text-white relative overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Resolved Today</p>
                        <h3 className="text-[32px] font-bold tracking-tight">{stats.resolved}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <FaCheck className="text-2xl" />
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-6 mb-10">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                        <FaSearch className="text-[#9CA3AF] text-base" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tickets by ID, customer, or subject..."
                        className="w-full pl-14 pr-6 py-4.5 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] transition-all shadow-sm font-medium"
                    />
                </div>
                <div className="flex gap-4">
                    <select className="px-8 py-4.5 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 text-[13px] font-bold text-[#111827] cursor-pointer appearance-none min-w-[160px] shadow-sm uppercase tracking-widest">
                        <option>All Status</option>
                        <option>Open</option>
                        <option>Resolved</option>
                    </select>
                    <button className="flex items-center gap-3 px-8 py-4.5 bg-white border border-gray-100 rounded-[1.5rem] hover:bg-gray-50 text-[13px] font-bold text-[#6B7280] transition-all shadow-sm uppercase tracking-widest active:scale-95">
                        <FaFilter className="text-orange-500" /> More Filters
                    </button>
                </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-8">
                {tickets.map(ticket => (
                    <div key={ticket.id} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 group hover:shadow-2xl transition-all duration-500">
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                            <div className="flex items-start gap-6 flex-1">
                                <div className={`p-5 rounded-[2rem] shadow-lg ${ticket.priority === 'HIGH' ? 'bg-red-50 text-red-600 shadow-red-100' : 'bg-orange-50 text-orange-600 shadow-orange-100'}`}>
                                    <FaExclamationCircle className="text-3xl" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-4 mb-4">
                                        <span className="font-mono font-bold text-[15px] text-[#111827] bg-gray-50 px-4 py-1.5 rounded-xl border border-gray-100 tracking-tight shadow-sm">#{ticket._id.substring(0, 8)}</span>
                                        <span className={`text-[11px] px-4 py-1.5 rounded-xl font-bold uppercase tracking-widest border shadow-sm ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                                        <span className={`text-[11px] px-4 py-1.5 rounded-xl font-bold uppercase tracking-widest shadow-sm ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
                                    </div>
                                    <h3 className="text-[22px] font-bold text-[#111827] tracking-tight mb-3 group-hover:text-orange-500 transition-colors">{ticket.subject}</h3>
                                    <p className="text-[15px] text-[#6B7280] font-medium leading-relaxed mb-6">{ticket.description}</p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-6 border-y border-gray-50 mb-8">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-[0.2em]">Customer</span>
                                            <span className="text-[14px] font-bold text-[#111827] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                                {ticket.user?.name || ticket.user?.email || 'Unknown'}
                                            </span>
                                        </div>
                                        {ticket.order && (
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-[0.2em]">Order Ref</span>
                                                <span className="text-[14px] font-bold text-orange-500">#{ticket.order}</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-[0.2em]">Assigned To</span>
                                            <span className="text-[14px] font-bold text-[#111827] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                {ticket.assignee?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        <button className="px-8 py-3 bg-blue-50 text-blue-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:text-white rounded-xl font-bold text-[12px] uppercase tracking-widest transition-all shadow-sm active:scale-95">View Details</button>
                                        <button className="px-8 py-3 bg-red-50 text-red-600 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-600 hover:text-white rounded-xl font-bold text-[12px] uppercase tracking-widest transition-all shadow-sm active:scale-95">Process Refund</button>
                                        <button className="px-8 py-3 bg-gray-50 text-[#6B7280] hover:bg-[#111827] hover:text-white rounded-xl font-bold text-[12px] uppercase tracking-widest transition-all shadow-sm active:scale-95">Start Investigation</button>
                                        <button className="px-8 py-3 bg-emerald-50 text-emerald-600 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 hover:text-white rounded-xl font-bold text-[12px] uppercase tracking-widest transition-all shadow-sm active:scale-95">Mark Resolved</button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3 text-right">
                                <div className="bg-gray-50 px-6 py-3 rounded-[1.5rem] border border-gray-100 shadow-sm">
                                    <p className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-widest mb-1">Created On</p>
                                    <p className="text-[15px] font-bold text-[#111827]">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button className="text-[12px] font-bold text-orange-500 hover:text-pink-600 uppercase tracking-widest p-3 transition-colors active:scale-90">Contact Customer</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
