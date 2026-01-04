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
        <div className="p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Pending Payouts</h2>
                    <button className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-700 transition">
                        Process Batch Payout
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Due Date</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payouts.length > 0 ? (
                                payouts.map(payout => (
                                    <tr key={payout._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${payout.type === 'restaurant' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                } capitalize`}>
                                                {payout.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{payout.entityName || 'Unknown'}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">Rs {payout.totalAmount?.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${payout.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {payout.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {new Date(payout.weekEnd).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="px-4 py-1.5 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 shadow-sm">
                                                Pay Now
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No pending payouts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
