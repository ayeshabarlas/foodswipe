'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaTags } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

interface CreateDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateDealModal({ isOpen, onClose, onSuccess }: CreateDealModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        discount: '',
        discountType: 'percentage',
        startDate: '',
        endDate: '',
        minimumAmount: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.post(
                `${API_BASE_URL}/api/deals`,
                {
                    ...formData,
                    discount: parseFloat(formData.discount),
                    minimumAmount: parseFloat(formData.minimumAmount) || 0,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setFormData({
                title: '',
                description: '',
                discount: '',
                discountType: 'percentage',
                startDate: '',
                endDate: '',
                minimumAmount: '',
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to create deal:', error);
            alert(error.response?.data?.message || 'Failed to create deal');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-pink-500">
                            <div className="flex items-center gap-3">
                                <FaTags className="text-2xl text-white" />
                                <h3 className="text-xl font-bold text-white">Create Deal</h3>
                            </div>
                            <button onClick={onClose} className="text-white hover:text-gray-200">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Deal Title
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g., Weekend Special"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
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
                                    placeholder="Get 20% off on all pizzas this weekend"
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Discount
                                    </label>
                                    <input
                                        type="number"
                                        name="discount"
                                        required
                                        value={formData.discount}
                                        onChange={handleChange}
                                        placeholder="20"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Type
                                    </label>
                                    <select
                                        name="discountType"
                                        value={formData.discountType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                                    >
                                        <option value="percentage">%</option>
                                        <option value="fixed">Rs</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Minimum Order Amount (Rs)
                                </label>
                                <input
                                    type="number"
                                    name="minimumAmount"
                                    value={formData.minimumAmount}
                                    onChange={handleChange}
                                    placeholder="0"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        required
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        required
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Deal'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
