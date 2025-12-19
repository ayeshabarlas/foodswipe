'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaTicketAlt } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';

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
    });

    React.useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                code: initialData.code || '',
                discount: initialData.discountValue?.toString() || initialData.discount?.toString() || '',
                description: initialData.description || '',
                expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate).toISOString().split('T')[0] : '',
                minimumAmount: initialData.minOrder?.toString() || initialData.minimumAmount?.toString() || '',
                usageLimit: initialData.usageLimit === Infinity ? '' : (initialData.usageLimit?.toString() || ''),
            });
        } else if (isOpen && !initialData) {
            setFormData({
                code: '',
                discount: '',
                description: '',
                expiryDate: '',
                minimumAmount: '',
                usageLimit: '',
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
                name: formData.description.split(' ').slice(0, 3).join(' ') || 'Platform Voucher',
                discount: parseFloat(formData.discount),
                minimumAmount: parseFloat(formData.minimumAmount) || 0,
                usageLimit: parseInt(formData.usageLimit) || 1000,
            };

            if (initialData) {
                await axios.put(`${API_BASE_URL}/api/vouchers/${initialData._id}`, payload, config);
            } else {
                await axios.post(`${API_BASE_URL}/api/vouchers/admin`, payload, config);
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-orange-500 to-red-500">
                            <div className="flex items-center gap-3">
                                <FaTicketAlt className="text-2xl text-white" />
                                <h3 className="text-xl font-bold text-white">{initialData ? 'Edit Platform Voucher' : 'Create Platform Voucher'}</h3>
                            </div>
                            <button onClick={onClose} className="text-white hover:text-gray-200">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Voucher Code
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    required
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="e.g., WELCOME50"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Usage Limit
                                    </label>
                                    <input
                                        type="number"
                                        name="usageLimit"
                                        value={formData.usageLimit}
                                        onChange={handleChange}
                                        placeholder="1000"
                                        min="1"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    required
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Brief description of the voucher"
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Minimum Order Amount (Rs.)
                                </label>
                                <input
                                    type="number"
                                    name="minimumAmount"
                                    value={formData.minimumAmount}
                                    onChange={handleChange}
                                    placeholder="0"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    name="expiryDate"
                                    required
                                    value={formData.expiryDate}
                                    onChange={handleChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : (initialData ? 'Update Voucher' : 'Create Voucher')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
