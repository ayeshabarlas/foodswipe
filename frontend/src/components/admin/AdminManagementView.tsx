'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaUserShield, FaPlus, FaSearch, FaEllipsisV, FaShieldAlt } from 'react-icons/fa';

export default function AdminManagementView() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdmins();

        const socket = io(SOCKET_URL);
        
        socket.on('user_registered', () => {
            console.log('User update (possibly new admin) detected, refreshing...');
            fetchAdmins();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchAdmins = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            // Use the getUsers endpoint with role=admin
            const { data } = await axios.get(`${API_BASE_URL}/api/admin/users?role=admin`, config);
            setAdmins(data);
        } catch (error) {
            console.error('Error fetching admins:', error);
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { name: 'Super Admin', desc: 'Full system access', color: 'bg-red-50 text-red-700 border-red-100' },
        { name: 'Finance Admin', desc: 'Payouts, Refunds, Finance', color: 'bg-green-50 text-green-700 border-green-100' },
        { name: 'Support Admin', desc: 'Support, Refunds, Customers', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        { name: 'Restaurant Manager', desc: 'Restaurants, Menu Approval', color: 'bg-orange-50 text-orange-700 border-orange-100' },
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Admin Management</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Manage system administrators and roles</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 shadow-md shadow-orange-500/20 transition text-xs uppercase tracking-wider">
                    <FaPlus /> Add Admin
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Total Admins</p>
                        <h3 className="text-xl font-bold text-gray-800">{admins.length}</h3>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-lg text-blue-500">
                        <FaUserShield className="text-lg" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Active Now</p>
                    <h3 className="text-xl font-bold text-green-600">{admins.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Defined Roles</p>
                    <h3 className="text-xl font-bold text-gray-800">{roles.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Recent Logs</p>
                    <h3 className="text-xl font-bold text-gray-800">24h</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Admin List */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4 gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                                type="text"
                                placeholder="Search admins..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                            />
                        </div>
                        <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none text-gray-600 text-xs font-bold uppercase">
                            <option>All Roles</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Admin</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admins.map(admin => (
                                    <tr key={admin._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-3">
                                            <div className="text-xs">
                                                <p className="font-bold text-gray-800">{admin.name}</p>
                                                <p className="text-[10px] text-gray-500">{admin.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase">
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase">
                                                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-[11px] text-gray-500 font-medium">
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-400">
                                            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition"><FaEllipsisV className="text-xs" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Role Permissions */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Role Definitions</h3>
                    <div className="space-y-3">
                        {roles.map((role, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border ${role.color.replace('text-', 'border-').replace('700', '200')} ${role.color.split(' ')[0]} bg-opacity-30`}>
                                <h4 className="text-xs font-bold mb-0.5">{role.name}</h4>
                                <p className="text-[10px] font-medium opacity-70">{role.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
