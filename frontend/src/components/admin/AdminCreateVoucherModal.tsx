'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaTicketAlt } from 'react-icons/fa';
import axios from 'axios';
import { getApiUrl } from '../../utils/config';

interface AdminCreateVoucherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function AdminCreateVoucherModal({ isOpen, onClose, onSuccess, initialData }: AdminCreateVoucherModalProps) {
    const [formData, setFormData] = useState({
        code: '',
        discount: '',
        description: '',
        expiryDate: '',
        minimumAmount: '',
        usageLimit: '',
        fundedBy: 'platform',
        restaurantId: '',
    });
    const [restaurants, setRestaurants] = useState<any[]>([]);

    React.useEffect(() => {
        fetchRestaurants();
    }, []);

    const fetchRestaurants = async () => {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const token = userInfoStr ? JSON.parse(userInfoStr).token : null;
            if (!token) return;

            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(`${getApiUrl()}/api/admin/restaurants`, config);
            setRestaurants(data);
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
        }
    };

    React.useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                code: initialData.code || '',
                discount: initialData.discountValue?.toString() || initialData.discount?.toString() || '',
                description: initialData.description || '',
                expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate).toISOString().split('T')[0] : '',
                minimumAmount: initialData.minOrder?.toString() || initialData.minimumAmount?.toString() || '',
                usageLimit: initialData.usageLimit === Infinity ? '' : (initialData.usageLimit?.toString() || ''),
                fundedBy: initialData.fundedBy?.toLowerCase() || 'platform',
                restaurantId: initialData.restaurant?._id || initialData.restaurant || '',
            });
        } else if (isOpen && !initialData) {
            setFormData({
                code: '',
                discount: '',
                description: '',
                expiryDate: '',
                minimumAmount: '',
                usageLimit: '',
                fundedBy: 'platform',
                restaurantId: '',
            });
        }
    }, [isOpen, initialData]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userInfoStr = localStorage.getItem('userInfo');
            let token = userInfoStr ? JSON.parse(userInfoStr).token : null;

            // Fallback: try getting token directly if not in userInfo
            if (!token) {
                token = localStorage.getItem('token');
            }

            if (!token) throw new Error('No authentication token found. Please log in again.');

            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                ...formData,
                name: formData.description.split(' ').slice(0, 3).join(' ') || formData.code || 'Platform Voucher',
                discount: parseFloat(formData.discount),
                minimumAmount: parseFloat(formData.minimumAmount) || 0,
                usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : 1000,
            };

            console.log('Sending voucher payload:', payload);

            if (initialData) {
                await axios.put(`${getApiUrl()}/api/vouchers/${initialData._id}`, payload, config);
            } else {
                const response = await axios.post(`${getApiUrl()}/api/vouchers/admin`, payload, config);
                console.log('Voucher creation response:', response.data);
            }

            setFormData({
                code: '',
                discount: '',
                description: '',
                expiryDate: '',
                minimumAmount: '',
                usageLimit: '',
            });
            onSuccess();
            onClose();
            alert(`Voucher ${initialData ? 'updated' : 'created'} successfully!`);
        } catch (error: any) {
            console.error('Failed to create voucher:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to process request';
            if (error.response?.status === 401) {
                alert(`Session expired or unauthorized. Please log out and log in again.\nError: ${msg}`);
            } else {
                alert(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827]/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                    <FaTicketAlt className="text-xl text-white" />
                                </div>
                                <div>
                                    <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">
                                        {initialData ? 'Edit Voucher' : 'Create Voucher'}
                                    </h3>
                                    <p className="text-[13px] text-[#6B7280] font-medium">Platform-wide promotion settings</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="w-10 h-10 flex items-center justify-center hover:bg-gray-200/50 rounded-2xl transition-all text-[#111827] active:scale-90"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                    Voucher Code
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    required
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="e.g., WELCOME50"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] font-bold tracking-wider placeholder:text-[#9CA3AF] transition-all uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                        Discount (Rs.)
                                    </label>
                                    <input
                                        type="number"
                                        name="discount"
                                        required
                                        value={formData.discount}
                                        onChange={handleChange}
                                        placeholder="500"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] font-bold placeholder:text-[#9CA3AF] transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                        Usage Limit
                                    </label>
                                    <input
                                        type="number"
                                        name="usageLimit"
                                        value={formData.usageLimit}
                                        onChange={handleChange}
                                        placeholder="1000"
                                        min="1"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] font-bold placeholder:text-[#9CA3AF] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    required
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Brief description of the voucher"
                                    rows={3}
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                        Funded By
                                    </label>
                                    <select
                                        name="fundedBy"
                                        value={formData.fundedBy}
                                        onChange={(e) => setFormData({ ...formData, fundedBy: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] font-bold cursor-pointer transition-all"
                                    >
                                        <option value="platform">Platform</option>
                                        <option value="restaurant">Restaurant</option>
                                    </select>
                                </div>
                                {formData.fundedBy === 'restaurant' && (
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                            Select Restaurant
                                        </label>
                                        <select
                                            name="restaurantId"
                                            required={formData.fundedBy === 'restaurant'}
                                            value={formData.restaurantId}
                                            onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] font-bold cursor-pointer transition-all"
                                        >
                                            <option value="">Select a restaurant</option>
                                            {restaurants.map((rest: any) => (
                                                <option key={rest._id} value={rest._id}>
                                                    {rest.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                        Min Order (Rs.)
                                    </label>
                                    <input
                                        type="number"
                                        name="minimumAmount"
                                        value={formData.minimumAmount}
                                        onChange={handleChange}
                                        placeholder="0"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] font-bold placeholder:text-[#9CA3AF] transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                        Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        name="expiryDate"
                                        required
                                        value={formData.expiryDate}
                                        onChange={handleChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] font-bold cursor-pointer transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-[#111827] text-[13px] font-bold rounded-2xl transition-all uppercase tracking-wider active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-2 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[13px] font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        initialData ? 'Update Voucher' : 'Create Voucher'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

