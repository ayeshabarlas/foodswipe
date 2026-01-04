'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaPlus, FaFilter, FaEdit, FaTrash, FaTicketAlt } from 'react-icons/fa';
import AdminCreateVoucherModal from './AdminCreateVoucherModal';

interface Voucher {
    _id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscount: number;
    minOrder: number;
    validUntil: string;
    status: string;
    usageCount: number;
    usageLimit: number;
    fundedBy: 'Platform' | 'Restaurant';
    totalCost: number;
}

export default function VouchersView() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

    useEffect(() => {
        fetchVouchers();

        const socket = io(SOCKET_URL);

        socket.on('new_voucher', () => {
            fetchVouchers();
        });

        socket.on('voucher_updated', () => {
            fetchVouchers();
        });

        socket.on('voucher_deleted', () => {
            fetchVouchers();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchVouchers = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            const { data } = await axios.get(`${API_BASE_URL}/api/vouchers/admin/all`, config);
            setVouchers(data.map((v: any) => ({
                ...v,
                status: v.isActive ? (new Date(v.expiryDate) > new Date() ? 'Active' : 'Expired') : 'Inactive',
                validUntil: new Date(v.expiryDate).toLocaleDateString(),
                usageLimit: v.maxUsage || Infinity,
                totalCost: v.totalCost || 0,
                fundedBy: v.fundedBy ? (v.fundedBy.charAt(0).toUpperCase() + v.fundedBy.slice(1)) : 'Platform',
                discountValue: v.discount,
                discountType: v.discountType,
                minOrder: v.minimumAmount
            })));
        } catch (error) {
            console.error('Error fetching vouchers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (voucher: Voucher) => {
        setEditingVoucher(voucher);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this voucher?')) return;

        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) {
                alert('Session expired. Please login again.');
                return;
            }
            const userInfo = JSON.parse(userInfoStr);
            console.log('Attempting to delete voucher:', id); // Debug log

            await axios.delete(`${API_BASE_URL}/api/vouchers/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            // Remove from state immediately to update UI without waiting for refetch
            setVouchers(prev => prev.filter(v => v._id !== id));
            // Also trigger fetch to be sure
            fetchVouchers();
        } catch (error: any) {
            console.error('Error deleting voucher:', error.response?.data || error.message);
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
            } else if (error.response?.status === 403) {
                alert('You are not authorized to delete this voucher.');
            } else {
                alert(error.response?.data?.message || 'Failed to delete voucher');
            }
        }
    };

    const handleCreate = () => {
        setEditingVoucher(null);
        setIsModalOpen(true);
    };

    const stats = {
        total: vouchers.length,
        active: vouchers.filter(v => v.status === 'Active').length,
        totalUsage: vouchers.reduce((acc, v) => acc + (v.usageCount || 0), 0),
        totalCost: vouchers.reduce((acc, v) => acc + (v.totalCost || 0), 0)
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Vouchers & Discounts</h2>
                    <p className="text-gray-500">Manage platform and restaurant-funded promotions</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 shadow-lg shadow-orange-500/20 font-medium transition"
                >
                    <FaPlus /> Create Voucher
                </button>
            </div>

            <AdminCreateVoucherModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchVouchers}
                initialData={editingVoucher}
            />

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">Total Vouchers</p>
                    <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">Active Vouchers</p>
                    <h3 className="text-2xl font-bold text-green-600">{stats.active}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">Total Usage</p>
                    <h3 className="text-2xl font-bold text-gray-800">{stats.totalUsage.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">Total Cost</p>
                    <h3 className="text-2xl font-bold text-orange-600">Rs {stats.totalCost.toLocaleString()}</h3>
                </div>
            </div>

            {/* Funding Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-lg font-bold mb-2">Platform-Funded Discounts</h3>
                    <p className="text-3xl font-bold mb-1">Rs {vouchers.filter(v => v.fundedBy === 'Platform').reduce((acc, v) => acc + (v.totalCost || 0), 0).toLocaleString()}</p>
                    <p className="text-white/80 text-sm">Paid from platform commission earnings</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-lg font-bold mb-2">Restaurant-Funded Discounts</h3>
                    <p className="text-3xl font-bold mb-1">Rs {vouchers.filter(v => v.fundedBy !== 'Platform').reduce((acc, v) => acc + (v.totalCost || 0), 0).toLocaleString()}</p>
                    <p className="text-white/80 text-sm">Deducted from restaurant wallets</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaTicketAlt className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search voucher codes..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <div className="flex gap-3">
                    <select className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white text-gray-600">
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Expired</option>
                    </select>
                    <select className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white text-gray-600">
                        <option>All Funding</option>
                        <option>Platform</option>
                        <option>Restaurant</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                        <FaFilter /> More Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Discount</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Funded By</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Min Order</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Usage</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Total Cost</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Valid Until</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {vouchers.map((voucher) => (
                            <tr key={voucher._id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 font-mono font-medium text-gray-700">{voucher.code}</td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-800">
                                        {voucher.discountType === 'percentage' ? `${voucher.discountValue}%` : `Rs ${voucher.discountValue}`}
                                    </div>
                                    <div className="text-xs text-gray-500">Max: Rs {voucher.maxDiscount}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${voucher.fundedBy === 'Platform' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {voucher.fundedBy}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">Rs {voucher.minOrder}</td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-800">{voucher.usageCount} / {voucher.usageLimit}</div>
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                                        <div
                                            className={`h-full rounded-full ${voucher.usageCount / voucher.usageLimit > 0.8 ? 'bg-red-500' : 'bg-orange-500'}`}
                                            style={{ width: `${(voucher.usageCount / voucher.usageLimit) * 100}%` }}
                                        ></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-800">Rs {voucher.totalCost.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-400 text-xs">ðŸ“…</span>
                                        {voucher.validUntil}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${voucher.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {voucher.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 text-gray-400">
                                        <button onClick={() => handleEdit(voucher)} className="hover:text-orange-500"><FaEdit /></button>
                                        <button onClick={() => handleDelete(voucher._id)} className="hover:text-red-500"><FaTrash /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
