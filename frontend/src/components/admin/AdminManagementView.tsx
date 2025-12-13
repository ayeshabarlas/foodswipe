import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUserShield, FaPlus, FaSearch, FaEllipsisV, FaShieldAlt } from 'react-icons/fa';

export default function AdminManagementView() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            // Use the getUsers endpoint with role=admin
            const { data } = await axios.get('http://localhost:5000/api/admin/users?role=admin', config);
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
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Admin Management</h2>
                    <p className="text-gray-500">Manage admin users, roles, and permissions</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 shadow-lg shadow-orange-500/20 font-medium transition">
                    <FaPlus /> Add Admin
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Total Admins</p>
                        <h3 className="text-2xl font-bold text-gray-800">{admins.length}</h3>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                        <FaUserShield />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">Active Admins</p>
                    <h3 className="text-2xl font-bold text-green-600">{admins.length}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">Roles</p>
                    <h3 className="text-2xl font-bold text-gray-800">1</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">Recent Actions</p>
                    <h3 className="text-2xl font-bold text-gray-800">5</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Admin List */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search admins..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <select className="ml-4 px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none text-gray-600">
                            <option>All Roles</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Admin</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Last Login</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admins.map(admin => (
                                    <tr key={admin._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{admin.name}</div>
                                            <div className="text-xs text-gray-500">{admin.email}</div>
                                            <div className="text-xs text-gray-400">{admin.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-400">
                                            <button className="hover:text-gray-600"><FaEllipsisV /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Role Permissions */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-4">Role Permissions</h3>
                    <div className="space-y-4">
                        {roles.map((role, idx) => (
                            <div key={idx} className={`p-4 rounded-xl border ${role.color} bg-opacity-50`}>
                                <h4 className="font-bold mb-1">{role.name}</h4>
                                <p className="text-sm opacity-80">{role.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
