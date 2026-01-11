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
        <div className="p-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Support & Tickets</h2>
                <p className="text-gray-500">Manage customer support, refunds, and disputes</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Total Tickets</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><FaHeadset /></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Open Tickets</p>
                        <h3 className="text-2xl font-bold text-orange-600">{stats.open}</h3>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg text-orange-600"><FaClock /></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Refund Requests</p>
                        <h3 className="text-2xl font-bold text-red-600">{stats.refunds}</h3>
                    </div>
                    <div className="bg-red-100 p-3 rounded-lg text-red-600 font-bold">Rs</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Resolved Today</p>
                        <h3 className="text-2xl font-bold text-green-600">{stats.resolved}</h3>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg text-green-600"><FaCheck /></div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-lg">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tickets by ID, customer, or subject..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <div className="flex gap-3">
                    <select className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white text-gray-600">
                        <option>All Status</option>
                        <option>Open</option>
                        <option>Resolved</option>
                    </select>
                    <select className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white text-gray-600">
                        <option>All Types</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                        <FaFilter /> More Filters
                    </button>
                </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-4">
                {tickets.map(ticket => (
                    <div key={ticket.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-100 p-3 rounded-xl">
                                    {ticket.priority === 'HIGH' ? <FaExclamationCircle className="text-red-500 text-xl" /> : <FaExclamationCircle className="text-orange-500 text-xl" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono font-bold text-gray-800">{ticket._id.substring(0, 8)}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(ticket.priority)} font-bold`}>{ticket.priority}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-800">{ticket.subject}</h3>
                                    <p className="text-sm text-gray-500">{ticket.description}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                <p className="text-xs text-gray-500 mt-1">Assigned to: {ticket.assignee?.name || 'Unassigned'}</p>
                            </div>
                        </div>

                        <div className="ml-14 mb-6 text-sm text-gray-600">
                            <span className="mr-4">Customer: <span className="font-medium text-gray-800">{ticket.user?.name || ticket.user?.email || 'Unknown'}</span></span>
                            {ticket.order && <span className="mr-4">Order: <span className="font-medium text-gray-800">#{ticket.order}</span></span>}
                        </div>

                        <div className="ml-14 flex gap-3">
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md shadow-blue-500/20 text-sm">View Details</button>
                            <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium shadow-md shadow-green-500/20 text-sm">Process Refund</button>
                            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-sm">Start Investigation</button>
                            <button className="px-4 py-2 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 text-sm">Mark Resolved</button>
                            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-sm">Contact Customer</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
