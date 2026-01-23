'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { getApiUrl } from '../../utils/config';
import { FaUserShield, FaPlus, FaSearch, FaEllipsisV, FaShieldAlt, FaTimes, FaEnvelope, FaUserTag } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AdminManagementView() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteData, setInviteData] = useState({
        name: '',
        email: '',
        role: 'admin'
    });
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        fetchAdmins();

        const socket = getSocket();
        
        if (socket) {
            const handleUpdate = () => {
                console.log('User update (possibly new admin) detected, refreshing...');
                fetchAdmins();
            };

            socket.on('user_registered', handleUpdate);

            return () => {
                socket.off('user_registered', handleUpdate);
            };
        }
    }, []);

    const fetchAdmins = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            // Use the new list endpoint
            const { data } = await axios.get(`${getApiUrl()}/api/admin/list`, config);
            setAdmins(data);
        } catch (error: any) {
            console.error('Error fetching admins:', error);
            toast.error('Failed to load admins list');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        const toastId = toast.loading('Sending invitation...');

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            await axios.post(
                `${getApiUrl()}/api/admin/invite`,
                inviteData,
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            toast.success('Invitation sent successfully!', { id: toastId });
            setIsInviteModalOpen(false);
            setInviteData({ name: '', email: '', role: 'admin' });
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send invitation', { id: toastId });
        } finally {
            setInviting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this administrator?')) return;

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            await axios.delete(
                `${getApiUrl()}/api/admin/${id}`,
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            toast.success('Administrator removed');
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete administrator');
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
                <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-500/20 transition-all active:scale-95 text-[13px] uppercase tracking-widest shadow-lg"
                >
                    <FaPlus className="text-sm" /> Invite Admin
                </button>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Invite Administrator</h3>
                                <p className="text-sm text-gray-500 mt-1">Send an email invitation</p>
                            </div>
                            <button 
                                onClick={() => setIsInviteModalOpen(false)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <FaTimes className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleInvite} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                                <div className="relative">
                                    <FaPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                    <input
                                        required
                                        type="text"
                                        value={inviteData.name}
                                        onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all font-medium"
                                        placeholder="Enter name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                    <input
                                        required
                                        type="email"
                                        value={inviteData.email}
                                        onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all font-medium"
                                        placeholder="admin@foodswipe.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Assigned Role</label>
                                <div className="relative">
                                    <FaUserTag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                    <select
                                        value={inviteData.role}
                                        onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="super-admin">Super Admin</option>
                                        <option value="finance-admin">Finance Admin</option>
                                        <option value="support-admin">Support Admin</option>
                                        <option value="restaurant-manager">Restaurant Manager</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={inviting}
                                className="w-full py-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 uppercase tracking-widest text-sm"
                            >
                                {inviting ? 'Sending...' : 'Send Invitation'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-6 rounded-[2rem] shadow-xl shadow-orange-500/10 flex items-center justify-between hover:shadow-2xl transition-all group active:scale-[0.98] text-white relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] uppercase font-bold mb-1 tracking-widest">Total Admins</p>
                        <h3 className="text-[28px] font-bold tracking-tight">{admins.length}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <FaUserShield className="text-2xl" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2rem] shadow-xl shadow-emerald-500/10 flex items-center justify-between hover:shadow-2xl transition-all group active:scale-[0.98] text-white relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] uppercase font-bold mb-1 tracking-widest">Active Now</p>
                        <h3 className="text-[28px] font-bold tracking-tight">{admins.length}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-blue-500/10 flex items-center justify-between hover:shadow-2xl transition-all group active:scale-[0.98] text-white relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] uppercase font-bold mb-1 tracking-widest">Defined Roles</p>
                        <h3 className="text-[28px] font-bold tracking-tight">{roles.length}</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <FaShieldAlt className="text-2xl" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-6 rounded-[2rem] shadow-xl shadow-purple-500/10 flex items-center justify-between hover:shadow-2xl transition-all group active:scale-[0.98] text-white relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] uppercase font-bold mb-1 tracking-widest">Recent Activity</p>
                        <h3 className="text-[28px] font-bold tracking-tight">24h</h3>
                    </div>
                    <div className="relative z-10 bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                        <FaSearch className="text-2xl" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Admin List */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6 gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <FaSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search administrators..."
                                className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-[15px] text-[#111827] shadow-sm font-medium"
                            />
                        </div>
                        <select className="px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none text-[#6B7280] text-[12px] font-bold uppercase tracking-widest focus:border-orange-500 cursor-pointer shadow-sm hover:bg-gray-50 transition-colors">
                            <option>All Roles</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-[0.2em]">Administrator</th>
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-[0.2em]">Role</th>
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-8 py-6 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-[0.2em]">Joined</th>
                                    <th className="px-8 py-6 text-right text-[11px] font-bold text-[#6B7280] uppercase tracking-[0.2em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admins.map(admin => (
                                    <tr key={admin._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div>
                                                <p className="font-bold text-[#111827] text-[15px] group-hover:text-orange-500 transition-colors">{admin.name}</p>
                                                <p className="text-[13px] text-[#6B7280] mt-1 font-medium">{admin.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-4 py-2 rounded-xl text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100 uppercase tracking-widest">
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                                                admin.status === 'active' 
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                    : admin.status === 'pending'
                                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                        : 'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    admin.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                                }`}></div>
                                                {admin.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-[14px] text-[#6B7280] font-bold">
                                            {new Date(admin.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button 
                                                onClick={() => handleDelete(admin._id)}
                                                className="p-3 hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 rounded-2xl transition-all active:scale-90"
                                            >
                                                <FaTimes className="text-sm" />
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
                    <h3 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full"></div>
                        Role Definitions
                    </h3>
                    <div className="space-y-4">
                        {roles.map((role, idx) => (
                            <div key={idx} className={`p-6 rounded-[2rem] border transition-all cursor-default relative overflow-hidden group hover:shadow-lg active:scale-[0.98] ${role.color.replace('text-', 'border-').replace('700', '200')} ${role.color.split(' ')[0]} bg-opacity-20`}>
                                <div className="relative z-10">
                                    <h4 className="text-[15px] font-bold text-[#111827] mb-1.5">{role.name}</h4>
                                    <p className="text-[13px] text-[#6B7280] font-medium leading-relaxed">{role.desc}</p>
                                </div>
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                    <FaShieldAlt className="text-4xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

