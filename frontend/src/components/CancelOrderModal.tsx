'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import axios from 'axios';

interface CancelOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    onCancelSuccess: () => void;
}

const cancellationReasons = [
    { id: 'out_of_stock', label: 'Out of stock' },
    { id: 'kitchen_overload', label: 'Kitchen overload' },
    { id: 'staff_unavailable', label: 'Staff unavailable' },
    { id: 'technical_issue', label: 'Technical issue' },
];

export default function CancelOrderModal({ isOpen, onClose, orderId, onCancelSuccess }: CancelOrderModalProps) {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleConfirmCancel = async () => {
        if (!selectedReason) {
            alert('Please select a reason for cancellation');
            return;
        }

        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;

            await axios.patch(
                `http://localhost:5000/api/orders/${orderId}/cancel`,
                { reason: selectedReason },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            onCancelSuccess();
            onClose();
            setSelectedReason('');
        } catch (error: any) {
            console.error('Error cancelling order:', error);
            alert(error.response?.data?.message || 'Failed to cancel order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-[90] p-8"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Cancel Order</h2>
                                <p className="text-sm text-gray-500 mt-1">Please select a reason for cancellation. The customer will be notified automatically.</p>
                            </div>
                        </div>

                        {/* Cancellation Reasons */}
                        <div className="space-y-3 mb-8">
                            {cancellationReasons.map((reason) => (
                                <button
                                    key={reason.id}
                                    onClick={() => setSelectedReason(reason.id)}
                                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${selectedReason === reason.id
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{reason.label}</span>
                                        {selectedReason === reason.id && (
                                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                disabled={loading || !selectedReason}
                                className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
