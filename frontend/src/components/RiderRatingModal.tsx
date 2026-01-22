'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaTimes, FaMotorcycle } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import toast from 'react-hot-toast';

interface RiderRatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    riderName: string;
    onSuccess?: () => void;
}

export default function RiderRatingModal({ isOpen, onClose, orderId, riderName, onSuccess }: RiderRatingModalProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setLoading(true);
        try {
            // Robust token retrieval
            let token = localStorage.getItem('token');
            const userInfoStr = localStorage.getItem('userInfo');
            
            if (!token && userInfoStr) {
                try {
                    const userInfo = JSON.parse(userInfoStr);
                    token = userInfo.token;
                } catch (e) {
                    console.error('Error parsing userInfo for token:', e);
                }
            }

            if (!token) {
                toast.error('Session expired. Please login again.');
                setLoading(false);
                return;
            }

            await axios.post(
                `${API_BASE_URL}/api/orders/${orderId}/rate-rider`,
                { rating, review },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Thank you for your rating!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error submitting rating:', error);
            toast.error(error.response?.data?.message || 'Failed to submit rating');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden relative z-10 shadow-2xl"
                    >
                        <div className="p-8 text-center">
                            <button 
                                onClick={onClose}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FaTimes size={20} />
                            </button>

                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-6 shadow-inner">
                                <FaMotorcycle size={36} />
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Rate your Rider</h3>
                            <p className="text-gray-500 text-sm mb-8">How was your delivery experience with <span className="font-bold text-gray-900">{riderName}</span>?</p>

                            <div className="flex justify-center gap-3 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        className="transition-transform active:scale-90"
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(star)}
                                    >
                                        <FaStar
                                            size={32}
                                            className={`transition-colors duration-200 ${
                                                star <= (hover || rating) ? 'text-yellow-400' : 'text-gray-200'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                placeholder="Write a quick review (optional)..."
                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 min-h-[100px] mb-6 resize-none"
                            />

                            <button
                                onClick={handleSubmit}
                                disabled={loading || rating === 0}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? 'Submitting...' : 'Submit Rating'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
