'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaTicketAlt } from 'react-icons/fa';
import axios from 'axios';
import { getApiUrl } from '../utils/config';

interface CreateVoucherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateVoucherModal({ isOpen, onClose, onSuccess }: CreateVoucherModalProps) {
    const [formData, setFormData] = useState({
        code: '',
        discount: '',
        description: '',
        expiryDate: '',
        minimumAmount: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.post(
                `${getApiUrl()}/api/vouchers/restaurant`,
                {
                    ...formData,
                    name: formData.code, // Added name field
                    discount: parseFloat(formData.discount),
                    minimumAmount: parseFloat(formData.minimumAmount) || 0,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setFormData({
                code: '',
                discount: '',
                description: '',
                expiryDate: '',
                minimumAmount: '',
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to create voucher:', error);
            alert(error.response?.data?.message || 'Failed to create voucher');
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
                                <h3 className="text-xl font-bold text-white">Create Voucher</h3>
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
                                    placeholder="e.g., SAVE20"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Discount Amount (Rs.)
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
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    required
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Save Rs. 500 on orders above Rs. 2000"
                                    rows={3}
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
                                {loading ? 'Creating...' : 'Create Voucher'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

