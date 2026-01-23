'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { getApiUrl } from '../../utils/config';
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
    displayFundedBy: string;
    totalCost: number;
    restaurant?: {
        _id: string;
        name: string;
    };
}

export default function VouchersView() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [filteredVouchers, setFilteredVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [fundingFilter, setFundingFilter] = useState('All Funding');

    useEffect(() => {
        fetchVouchers();

        const socket = getSocket();

        if (socket) {
            socket.on('new_voucher', fetchVouchers);
            socket.on('voucher_updated', fetchVouchers);
            socket.on('voucher_deleted', fetchVouchers);

            return () => {
                socket.off('new_voucher', fetchVouchers);
                socket.off('voucher_updated', fetchVouchers);
                socket.off('voucher_deleted', fetchVouchers);
            };
        }
    }, []);

    useEffect(() => {
        let result = vouchers;

        if (searchQuery) {
            result = result.filter(v => v.code.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (statusFilter !== 'All Status') {
            result = result.filter(v => v.status === statusFilter);
        }

        if (fundingFilter !== 'All Funding') {
            result = result.filter(v => v.fundedBy === fundingFilter);
        }

        setFilteredVouchers(result);
    }, [vouchers, searchQuery, statusFilter, fundingFilter]);

    const fetchVouchers = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };
            const { data } = await axios.get(`${getApiUrl()}/api/vouchers/admin/all`, config);
            setVouchers(data.map((v: any) => ({
                ...v,
                status: v.isActive ? (new Date(v.expiryDate) > new Date() ? 'Active' : 'Expired') : 'Inactive',
                validUntil: new Date(v.expiryDate).toLocaleDateString(),
                usageLimit: v.maxUsage || Infinity,
                totalCost: v.totalCost || 0,
                fundedBy: v.fundedBy ? (v.fundedBy.charAt(0).toUpperCase() + v.fundedBy.slice(1)) : 'Platform',
                discountValue: v.discount,
                discountType: v.discountType,
                minOrder: v.minimumAmount,
                displayFundedBy: v.fundedBy === 'restaurant' && v.restaurant ? v.restaurant.name : (v.fundedBy ? (v.fundedBy.charAt(0).toUpperCase() + v.fundedBy.slice(1)) : 'Platform')
            })));
        } catch (error: any) {
            console.error('Error fetching vouchers:', error);
            // Silence but log
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

            await axios.delete(`${getApiUrl()}/api/vouchers/${id}`, {
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
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Vouchers & Discounts</h2>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Manage platform and restaurant-funded promotions</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl hover:shadow-lg hover:shadow-orange-500/20 font-bold text-[13px] uppercase tracking-widest transition-all duration-300 active:scale-95"
                >
                    <FaPlus className="text-sm" /> Create Voucher
                </button>
            </div>

            <AdminCreateVoucherModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchVouchers}
                initialData={editingVoucher}
            />

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300 active:scale-[0.98]">
                    <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-2">Total Vouchers</p>
                    <h3 className="text-[32px] font-bold text-[#111827] tracking-tight">{stats.total}</h3>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 active:scale-[0.98]">
                    <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-2">Active Vouchers</p>
                    <h3 className="text-[32px] font-bold text-green-600 tracking-tight">{stats.active}</h3>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 active:scale-[0.98]">
                    <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-2">Total Usage</p>
                    <h3 className="text-[32px] font-bold text-[#111827] tracking-tight">{stats.totalUsage.toLocaleString()}</h3>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-8 rounded-[2rem] shadow-xl shadow-orange-500/10 relative overflow-hidden group active:scale-[0.98] transition-all text-white">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Total Cost</p>
                        <h3 className="text-[32px] font-bold text-white tracking-tight">Rs. {stats.totalCost.toLocaleString()}</h3>
                    </div>
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <FaTicketAlt className="text-7xl text-white" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-8 rounded-[2rem] border border-orange-100 flex items-center justify-between group hover:shadow-lg hover:shadow-orange-500/5 transition-all active:scale-[0.98]">
                    <div>
                        <p className="text-[11px] text-orange-500 font-bold uppercase tracking-widest mb-2">Platform Cost</p>
                        <p className="text-[28px] font-bold text-[#111827] tracking-tight">Rs. {vouchers.filter(v => v.fundedBy === 'Platform').reduce((acc, v) => acc + (v.totalCost || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-110 transition-transform duration-300 border border-orange-50">
                        <FaTicketAlt className="text-2xl" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-8 rounded-[2rem] border border-blue-100 flex items-center justify-between group hover:shadow-lg hover:shadow-blue-500/5 transition-all active:scale-[0.98]">
                    <div>
                        <p className="text-[11px] text-blue-600 font-bold uppercase tracking-widest mb-2">Restaurant Cost</p>
                        <p className="text-[28px] font-bold text-[#111827] tracking-tight">Rs. {vouchers.filter(v => v.fundedBy !== 'Platform').reduce((acc, v) => acc + (v.totalCost || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform duration-300 border border-blue-50">
                        <FaTicketAlt className="text-2xl" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaTicketAlt className="text-[#9CA3AF] text-sm" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search voucher codes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-all"
                    />
                </div>
                <div className="flex gap-3">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-6 py-3.5 bg-white border border-gray-100 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] text-[13px] font-bold text-[#111827] cursor-pointer appearance-none min-w-[140px]"
                    >
                        <option value="All Status">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <select 
                        value={fundingFilter}
                        onChange={(e) => setFundingFilter(e.target.value)}
                        className="px-6 py-3.5 bg-white border border-gray-100 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] text-[13px] font-bold text-[#111827] cursor-pointer appearance-none min-w-[140px]"
                    >
                        <option value="All Funding">All Funding</option>
                        <option value="Platform">Platform</option>
                        <option value="Restaurant">Restaurant</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Code</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Discount</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Funded By</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Min Order</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Usage</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Total Cost</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Valid Until</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-right text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredVouchers.map((voucher) => (
                                <tr key={voucher._id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <span className="text-[14px] font-bold text-[#111827] font-mono tracking-tight bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">{voucher.code}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-[14px] font-bold text-[#111827]">
                                            {voucher.discountType === 'percentage' ? `${voucher.discountValue}%` : `Rs. ${voucher.discountValue}`}
                                        </div>
                                        <div className="text-[12px] text-[#9CA3AF]">Max: Rs. {voucher.maxDiscount}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${voucher.fundedBy === 'Platform' ? 'bg-orange-50 text-[#FF6A00]' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            {voucher.displayFundedBy}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-[14px] font-medium text-[#6B7280]">Rs. {voucher.minOrder}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[13px] font-bold text-[#111827]">{voucher.usageCount}</span>
                                                <span className="text-[11px] font-medium text-[#9CA3AF]">/ {voucher.usageLimit}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${voucher.usageCount / voucher.usageLimit > 0.8 ? 'bg-red-500' : 'bg-[#FF6A00]'}`}
                                                    style={{ width: `${Math.min((voucher.usageCount / (voucher.usageLimit || 1)) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-[14px] font-bold text-[#111827]">Rs. {voucher.totalCost.toLocaleString()}</td>
                                    <td className="px-8 py-5 text-[14px] text-[#6B7280]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#9CA3AF]">📅</span>
                                            {voucher.validUntil}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${voucher.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-[#9CA3AF]'
                                            }`}>
                                            {voucher.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(voucher)} className="w-9 h-9 flex items-center justify-center bg-white border border-gray-100 text-[#6B7280] hover:text-[#FF6A00] hover:border-[#FF6A00] rounded-xl shadow-sm transition-all">
                                                <FaEdit className="text-sm" />
                                            </button>
                                            <button onClick={() => handleDelete(voucher._id)} className="w-9 h-9 flex items-center justify-center bg-white border border-gray-100 text-[#6B7280] hover:text-red-500 hover:border-red-500 rounded-xl shadow-sm transition-all">
                                                <FaTrash className="text-sm" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

