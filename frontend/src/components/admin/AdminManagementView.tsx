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
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Admin Management</h2>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Manage system administrators and role-based permissions</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-[#FF6A00] text-white rounded-xl font-bold hover:bg-[#e65f00] shadow-lg shadow-[#FF6A00]/20 transition-all active:scale-95 text-[12px] uppercase tracking-wider">
                    <FaPlus /> Add Admin
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Total Admins</p>
                        <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{admins.length}</h3>
                    </div>
                    <div className="bg-orange-50 w-14 h-14 rounded-2xl flex items-center justify-center text-[#FF6A00] group-hover:scale-110 transition-transform">
                        <FaUserShield className="text-2xl" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Active Now</p>
                        <h3 className="text-[26px] font-bold text-emerald-600 tracking-tight">{admins.length}</h3>
                    </div>
                    <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Defined Roles</p>
                        <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{roles.length}</h3>
                    </div>
                    <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <FaShieldAlt className="text-2xl" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Recent Activity</p>
                        <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">24h</h3>
                    </div>
                    <div className="bg-purple-50 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        <FaSearch className="text-2xl" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Admin List */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6 gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search administrators..."
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00] transition-all text-[14px] text-[#111827]"
                            />
                        </div>
                        <select className="px-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none text-[#6B7280] text-[12px] font-bold uppercase tracking-wider focus:border-[#FF6A00] cursor-pointer">
                            <option>All Roles</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Administrator</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Role</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Joined</th>
                                    <th className="px-8 py-5 text-right text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admins.map(admin => (
                                    <tr key={admin._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div>
                                                <p className="font-bold text-[#111827] text-[14px] group-hover:text-[#FF6A00] transition-colors">{admin.name}</p>
                                                <p className="text-[12px] text-[#6B7280] mt-0.5">{admin.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-3 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-[13px] text-[#6B7280] font-medium">
                                            {new Date(admin.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="p-2.5 hover:bg-gray-100 text-[#9CA3AF] hover:text-[#111827] rounded-xl transition-all">
                                                <FaEllipsisV className="text-sm" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Role Permissions */}
                <div>
                    <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full"></div>
                        Role Definitions
                    </h3>
                    <div className="space-y-4">
                        {roles.map((role, idx) => (
                            <div key={idx} className={`p-5 rounded-[1.5rem] border ${role.color.replace('text-', 'border-').replace('700', '200')} ${role.color.split(' ')[0]} bg-opacity-30 hover:scale-[1.02] transition-transform cursor-default`}>
                                <h4 className="text-[14px] font-bold text-[#111827] mb-1">{role.name}</h4>
                                <p className="text-[12px] text-[#6B7280] font-medium leading-relaxed">{role.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
