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
            <div className="mb-8">
                <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Support & Tickets</h2>
                <p className="text-[14px] font-normal text-[#6B7280] mt-1">Manage customer support, refunds, and disputes</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-md transition-all duration-300 flex justify-between items-center">
                    <div>
                        <p className="text-[#6B7280] text-[13px] font-medium uppercase tracking-wider mb-2">Total Tickets</p>
                        <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{stats.total}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform"><FaHeadset className="text-xl" /></div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-md transition-all duration-300 flex justify-between items-center">
                    <div>
                        <p className="text-[#6B7280] text-[13px] font-medium uppercase tracking-wider mb-2">Open Tickets</p>
                        <h3 className="text-[26px] font-bold text-[#FF6A00] tracking-tight">{stats.open}</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-[#FF6A00] shadow-sm group-hover:scale-110 transition-transform"><FaClock className="text-xl" /></div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-md transition-all duration-300 flex justify-between items-center">
                    <div>
                        <p className="text-[#6B7280] text-[13px] font-medium uppercase tracking-wider mb-2">Refund Requests</p>
                        <h3 className="text-[26px] font-bold text-red-600 tracking-tight">{stats.refunds}</h3>
                    </div>
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform font-bold text-xl">Rs</div>
                </div>
                <div className="bg-[#FF6A00] p-6 rounded-[2rem] shadow-xl shadow-[#FF6A00]/20 flex justify-between items-center group overflow-hidden relative">
                    <div className="relative z-10">
                        <p className="text-white/70 text-[13px] font-medium uppercase tracking-wider mb-2">Resolved Today</p>
                        <h3 className="text-[26px] font-bold text-white tracking-tight">{stats.resolved}</h3>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md relative z-10 group-hover:scale-110 transition-transform"><FaCheck className="text-xl" /></div>
                    <FaHeadset className="absolute -bottom-4 -right-4 text-6xl text-white/10 rotate-12" />
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaSearch className="text-[#9CA3AF] text-sm" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tickets by ID, customer, or subject..."
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-all"
                    />
                </div>
                <div className="flex gap-3">
                    <select className="px-6 py-3.5 bg-white border border-gray-100 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] text-[13px] font-bold text-[#111827] cursor-pointer appearance-none min-w-[140px]">
                        <option>All Status</option>
                        <option>Open</option>
                        <option>Resolved</option>
                    </select>
                    <button className="flex items-center gap-2 px-6 py-3.5 bg-white border border-gray-100 rounded-[1.25rem] hover:bg-gray-50 text-[13px] font-bold text-[#6B7280] transition-all">
                        <FaFilter /> More Filters
                    </button>
                </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-6">
                {tickets.map(ticket => (
                    <div key={ticket.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                            <div className="flex items-start gap-5 flex-1">
                                <div className={`p-4 rounded-[1.5rem] shadow-sm ${ticket.priority === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-[#FF6A00]'}`}>
                                    <FaExclamationCircle className="text-2xl" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className="font-mono font-bold text-[14px] text-[#111827] bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 tracking-tight">#{ticket._id.substring(0, 8)}</span>
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
                                    </div>
                                    <h3 className="text-[18px] font-bold text-[#111827] tracking-tight mb-2">{ticket.subject}</h3>
                                    <p className="text-[14px] text-[#6B7280] leading-relaxed mb-4">{ticket.description}</p>
                                    
                                    <div className="flex flex-wrap items-center gap-6 py-4 border-y border-gray-50 mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest mb-1">Customer</span>
                                            <span className="text-[13px] font-bold text-[#111827]">{ticket.user?.name || ticket.user?.email || 'Unknown'}</span>
                                        </div>
                                        {ticket.order && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest mb-1">Order Ref</span>
                                                <span className="text-[13px] font-bold text-[#111827]">#{ticket.order}</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest mb-1">Assigned To</span>
                                            <span className="text-[13px] font-bold text-[#111827]">{ticket.assignee?.name || 'Unassigned'}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button className="px-6 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all">View Details</button>
                                        <button className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all">Process Refund</button>
                                        <button className="px-6 py-2.5 bg-gray-50 text-[#6B7280] hover:bg-[#111827] hover:text-white rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all">Start Investigation</button>
                                        <button className="px-6 py-2.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all">Mark Resolved</button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                    <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest mb-0.5">Created On</p>
                                    <p className="text-[13px] font-bold text-[#111827]">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button className="text-[11px] font-bold text-[#FF6A00] hover:underline uppercase tracking-wider p-2">Contact Customer</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
