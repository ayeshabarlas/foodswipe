'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCloudUploadAlt, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

interface PaymentProofModalProps {
    isOpen: boolean;
    onClose: () => void;
    payoutId: string | null;
    totalAmount: number;
    onSuccess: () => void;
}

export default function PaymentProofModal({ isOpen, onClose, payoutId, totalAmount, onSuccess }: PaymentProofModalProps) {
    const [transactionId, setTransactionId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionId || !file) return;

        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;

            // 1. Upload file
            const formData = new FormData();
            formData.append('image', file);

            const uploadRes = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            const proofUrl = uploadRes.data.imageUrl || uploadRes.data; // Adjust based on upload response structure

            // 2. Submit proof
            await axios.post(
                `${API_BASE_URL}/api/payouts/upload-proof`,
                {
                    payoutId,
                    transactionId,
                    proofUrl,
                    totalSales: totalAmount / 0.9 // Reverse calc if needed, or backend handles it
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setUploadSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
                setUploadSuccess(false);
                setTransactionId('');
                setFile(null);
            }, 2000);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload proof. Please try again.');
        } finally {
            setLoading(false);
        }
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
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">Upload Payment Proof</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                <FaTimes />
                            </button>
                        </div>

                        {uploadSuccess ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FaCheckCircle className="text-3xl" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">Upload Successful!</h4>
                                <p className="text-gray-500">Your payment proof has been submitted for verification.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Amount to Pay
                                    </label>
                                    <div className="text-2xl font-bold text-gray-900">
                                        Rs. {totalAmount.toFixed(2)}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Transaction ID
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="Enter bank transaction ID"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Screenshot
                                    </label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                        <input
                                            type="file"
                                            required
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <FaCloudUploadAlt className="text-3xl text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">
                                            {file ? file.name : 'Click to upload receipt image'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !file || !transactionId}
                                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Uploading...' : 'Submit Proof'}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
