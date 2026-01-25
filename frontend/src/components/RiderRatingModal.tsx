'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaTimes, FaMotorcycle, FaUtensils, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
import toast from 'react-hot-toast';

interface RiderRatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    riderName?: string;
    onSuccess?: () => void;
}

export default function RiderRatingModal({ isOpen, onClose, orderId, riderName: initialRiderName, onSuccess }: RiderRatingModalProps) {
    const [step, setStep] = useState<'rider' | 'dishes'>('rider');
    const [order, setOrder] = useState<any>(null);
    const [riderRating, setRiderRating] = useState(0);
    const [riderReview, setRiderReview] = useState('');
    const [dishRatings, setDishRatings] = useState<Record<string, { rating: number; comment: string }>>({});
    const [hover, setHover] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetchingOrder, setFetchingOrder] = useState(false);

    React.useEffect(() => {
        if (isOpen && orderId) {
            fetchOrderDetails();
        }
    }, [isOpen, orderId]);

    const fetchOrderDetails = async () => {
        setFetchingOrder(true);
        try {
            let token = localStorage.getItem('token');
            const userInfoStr = localStorage.getItem('userInfo');
            
            if (!token && userInfoStr) {
                try {
                    const parsedUser = JSON.parse(userInfoStr);
                    token = parsedUser?.token || null;
                    if (token) {
                        localStorage.setItem('token', token);
                        console.log('🔑 RiderRatingModal: Token recovered from userInfo in fetchOrderDetails');
                    }
                } catch (e) {
                    console.error('Error parsing userInfo for token:', e);
                }
            }

            if (!token) {
                console.warn('No token found for fetching order details');
                setFetchingOrder(false);
                return;
            }

            const res = await axios.get(`${getApiUrl()}/api/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrder(res.data);
            
            // Initialize dish ratings
            const initialRatings: Record<string, { rating: number; comment: string }> = {};
            res.data.orderItems.forEach((item: any) => {
                const dishId = item.product?._id || item.product;
                if (dishId) {
                    initialRatings[dishId] = { rating: 5, comment: '' };
                }
            });
            setDishRatings(initialRatings);
        } catch (error) {
            console.error('Error fetching order for rating:', error);
        } finally {
            setFetchingOrder(false);
        }
    };

    const handleRiderSubmit = async () => {
        if (riderRating === 0) {
            toast.error('Please select a rating for the rider');
            return;
        }

        if (order?.orderItems?.length > 0) {
            setStep('dishes');
        } else {
            await submitAll();
        }
    };

    const submitAll = async () => {
        if (loading) return;
        
        setLoading(true);
        try {
            // Token recovery logic similar to CheckoutModal
            let token = localStorage.getItem('token');
            const userInfoStr = localStorage.getItem('userInfo');
            
            if (!token && userInfoStr) {
                try {
                    const parsedUser = JSON.parse(userInfoStr);
                    if (parsedUser.token) {
                        token = parsedUser.token;
                        localStorage.setItem('token', token || '');
                        console.log('🔑 RiderRatingModal: Token recovered from userInfo');
                    }
                } catch (e) {
                    console.error('❌ RiderRatingModal: Error parsing userInfo for token:', e);
                }
            }

            if (!token) {
                toast.error('Please login to submit feedback');
                setLoading(false);
                return;
            }

            const config = { 
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000 // 15 second timeout for ratings
            };

            // 1. Check if already rated (Idempotency)
            if (order && order.riderRating > 0) {
                console.log('⚠️ Order already rated, skipping rider rating submission');
            } else {
                // Submit Rider Rating
                try {
                    await axios.post(
                        `${getApiUrl()}/api/orders/${orderId}/rate-rider`,
                        { rating: riderRating, review: riderReview },
                        config
                    );
                } catch (err: any) {
                    // If already rated error from server, just log and continue to dishes
                    if (err.response?.status === 400 && err.response?.data?.message?.includes('already rated')) {
                        console.log('ℹ️ Rider already rated on server');
                    } else {
                        throw err; // Re-throw other errors
                    }
                }
            }

            // 2. Submit Dish Ratings
            const dishReviewPromises = Object.entries(dishRatings).map(([dishId, data]) => {
                // Only submit if a rating was actually given (rating > 0)
                if (data.rating === 0) return Promise.resolve();
                
                return axios.post(`${getApiUrl()}/api/reviews`, {
                    restaurantId: order.restaurant?._id || order.restaurant,
                    dishId,
                    orderId,
                    rating: data.rating,
                    comment: data.comment || 'Good food!'
                }, config).catch(err => {
                    console.error(`Failed to submit review for dish ${dishId}:`, err);
                    // Don't fail the whole process if one dish review fails
                    return null;
                });
            });

            if (dishReviewPromises.length > 0) {
                await Promise.all(dishReviewPromises);
            }

            toast.success('Thank you for your feedback!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('❌ RiderRatingModal: Error submitting ratings:', error);
            
            if (error.code === 'ECONNABORTED') {
                toast.error('Rating submission timed out. Please check your internet and try again.');
            } else if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const errorMessage = error.response.data?.message || 'Server error occurred';
                toast.error(errorMessage);
            } else if (error.request) {
                // The request was made but no response was received
                toast.error('No response from server. Please check your connection.');
            } else {
                // Something happened in setting up the request that triggered an Error
                toast.error(error.message || 'Failed to submit feedback');
            }
        } finally {
            setLoading(false);
        }
    };

    const riderName = initialRiderName || order?.rider?.user?.name || 'your rider';

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
                        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden relative z-10 shadow-2xl max-h-[90vh] flex flex-col"
                    >
                        <div className="p-6 overflow-y-auto no-scrollbar">
                            <button 
                                onClick={onClose}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-20"
                            >
                                <FaTimes size={20} />
                            </button>

                            {fetchingOrder ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-gray-500 font-medium">Loading details...</p>
                                </div>
                            ) : step === 'rider' ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-4 shadow-inner">
                                        <FaMotorcycle size={30} />
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Rate your Rider</h3>
                                    <p className="text-gray-500 text-xs mb-6">How was your delivery experience with <span className="font-bold text-gray-900">{riderName}</span>?</p>

                                    <div className="flex justify-center gap-2 mb-6">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                className="transition-transform active:scale-90"
                                                onMouseEnter={() => setHover(star)}
                                                onMouseLeave={() => setHover(0)}
                                                onClick={() => setRiderRating(star)}
                                            >
                                                <FaStar
                                                    size={28}
                                                    className={`transition-colors duration-200 ${
                                                        star <= (hover || riderRating) ? 'text-yellow-400' : 'text-gray-200'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        value={riderReview}
                                        onChange={(e) => setRiderReview(e.target.value)}
                                        placeholder="Write a quick review for the rider..."
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 min-h-[80px] mb-6 resize-none"
                                    />

                                    <button
                                        onClick={handleRiderSubmit}
                                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-orange-500/40 transition-all active:scale-[0.98]"
                                    >
                                        Next: Rate Food
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4 shadow-inner">
                                        <FaUtensils size={28} />
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Rate the Food</h3>
                                    <p className="text-gray-500 text-xs mb-6">How was the quality of your order?</p>

                                    <div className="space-y-6 mb-8 text-left">
                                        {order?.orderItems?.map((item: any) => {
                                            const dishId = item.product?._id || item.product;
                                            if (!dishId) return null;
                                            
                                            return (
                                                <div key={dishId} className="bg-gray-50 rounded-2xl p-4">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        {item.image && (
                                                            <img src={item.image} className="w-10 h-10 rounded-lg object-cover" alt={item.name} />
                                                        )}
                                                        <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                                                    </div>
                                                    
                                                    <div className="flex gap-2 mb-3">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                onClick={() => setDishRatings(prev => ({
                                                                    ...prev,
                                                                    [dishId]: { ...prev[dishId], rating: star }
                                                                }))}
                                                            >
                                                                <FaStar
                                                                    size={20}
                                                                    className={`transition-colors ${
                                                                        star <= (dishRatings[dishId]?.rating || 0) ? 'text-yellow-400' : 'text-gray-200'
                                                                    }`}
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={dishRatings[dishId]?.comment || ''}
                                                        onChange={(e) => setDishRatings(prev => ({
                                                            ...prev,
                                                            [dishId]: { ...prev[dishId], comment: e.target.value }
                                                        }))}
                                                        placeholder="Quick comment about this dish..."
                                                        className="w-full bg-white border-none rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-orange-500"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep('rider')}
                                            className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all active:scale-[0.98]"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={submitAll}
                                            disabled={loading}
                                            className="flex-[2] bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-orange-500/40 transition-all active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {loading ? 'Submitting...' : 'Submit All'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

