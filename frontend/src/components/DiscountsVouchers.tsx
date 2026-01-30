'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCopy, FaCheck, FaTicketAlt } from 'react-icons/fa';
import axios from 'axios';
import { getApiUrl } from '../utils/config';

interface DiscountsVouchersProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Voucher {
    _id: string;
    code: string;
    discount: number;
    description: string;
    expiryDate: string;
    minimumAmount: number;
    used: boolean;
}

export default function DiscountsVouchers({ isOpen, onClose }: DiscountsVouchersProps) {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copiedCode, setCopiedCode] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchVouchers();
        }
    }, [isOpen]);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');

            if (!token) {
                setVouchers([]);
                setLoading(false);
                return;
            }

            const response = await axios.get(`${getApiUrl()}/api/vouchers`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setVouchers(response.data);
        } catch (err: any) {
            console.error('Error fetching vouchers:', err);
            setVouchers([]);
            if (err.response?.status !== 401 && err.response?.status !== 404) {
                setError('Failed to load vouchers');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(''), 2000);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-50 z-50 shadow-2xl overflow-y-auto no-scrollbar"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-orange-red p-4 shadow-md z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-white text-xl font-bold">Discounts & Vouchers</h2>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-64">
                                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500">Loading vouchers...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="p-4">
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                    <p className="text-red-600">{error}</p>
                                    <button
                                        onClick={fetchVouchers}
                                        className="mt-3 text-red-600 font-medium hover:underline"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Vouchers List */}
                        {!loading && !error && vouchers.length > 0 && (
                            <div className="p-4 space-y-4">
                                {vouchers.map((voucher) => (
                                    <motion.div
                                        key={voucher._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`relative bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg overflow-hidden ${voucher.used ? 'opacity-50' : ''}`}
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="text-2xl font-bold">{voucher.discount}% OFF</h3>
                                                    <p className="text-sm text-white/90">{voucher.description}</p>
                                                </div>
                                                {voucher.used && (
                                                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                                                        Used
                                                    </span>
                                                )}
                                            </div>

                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-3">
                                                <div className="flex items-center justify-between">
                                                    <code className="text-lg font-bold tracking-wider">{voucher.code}</code>
                                                    <button
                                                        onClick={() => handleCopy(voucher.code)}
                                                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                                                        disabled={voucher.used}
                                                    >
                                                        {copiedCode === voucher.code ? (
                                                            <FaCheck size={16} />
                                                        ) : (
                                                            <FaCopy size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-xs text-white/80">
                                                <span>Min. order: Rs. {voucher.minimumAmount}</span>
                                                <span>Expires: {formatDate(voucher.expiryDate)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !error && vouchers.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                                <FaTicketAlt size={48} className="text-gray-300 mb-4" />
                                <p className="text-lg font-medium text-gray-700">No vouchers available</p>
                                <p className="text-sm text-gray-500 mt-2">Check back later for exclusive discounts and offers!</p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

