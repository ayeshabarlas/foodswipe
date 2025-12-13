'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaStar, FaUser, FaQuoteLeft, FaChartLine, FaComment, FaHeart } from 'react-icons/fa';
import axios from 'axios';

interface Review {
    _id: string;
    user: { _id: string; name: string };
    dish?: { _id: string; name: string; imageUrl: string };
    rating: number;
    comment: string;
    createdAt: string;
}

export default function DashboardReviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const restaurantRes = await axios.get('http://localhost:5000/api/restaurants/my-restaurant', {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            const reviewsRes = await axios.get(`http://localhost:5000/api/restaurants/${restaurantRes.data._id}/reviews`);
            setReviews(reviewsRes.data);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
        const interval = setInterval(fetchReviews, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading reviews...</div>;

    const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '0.0';

    // Calculate rating distribution
    const distribution = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
        percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0
    }));

    // Mock stats (would come from backend in real implementation)
    const newReviewsThisMonth = 24;
    const responseRate = 87;

    return (
        <div className="p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
                <p className="text-gray-500 text-sm">Manage your restaurant operations</p>
            </div>

            {/* Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Average Rating */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="text-6xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                        <FaStar className="text-yellow-400 text-5xl" />
                        {avgRating}
                    </div>
                    <div className="flex justify-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                            <FaStar key={i} className={`text-2xl ${i < Math.floor(parseFloat(avgRating)) ? 'text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                    </div>
                    <p className="text-gray-500 font-medium">{reviews.length} reviews</p>
                </div>

                {/* Rating Distribution */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h3 className="font-bold text-gray-900 mb-6">Rating Distribution</h3>
                    <div className="space-y-3">
                        {distribution.map((item) => (
                            <div key={item.star} className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-8">
                                    <span className="text-sm font-medium text-gray-700">{item.star}</span>
                                    <FaStar className="text-yellow-400 text-xs" />
                                </div>
                                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                                        style={{ width: `${item.percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm text-gray-600 w-12 text-right">{item.count}</span>
                                <span className="text-sm text-gray-500 w-12 text-right">{Math.round(item.percentage)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <FaChartLine className="text-2xl" />
                        </div>
                        <div className="text-xs opacity-75">This Month</div>
                    </div>
                    <div className="text-3xl font-bold">+{newReviewsThisMonth}</div>
                    <div className="text-sm opacity-90">New Reviews</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <FaComment className="text-2xl" />
                        </div>
                        <div className="text-xs opacity-75">Response Rate</div>
                    </div>
                    <div className="text-3xl font-bold">{responseRate}%</div>
                    <div className="text-sm opacity-90">Responded to reviews</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <FaHeart className="text-2xl" />
                        </div>
                        <div className="text-xs opacity-75">Avg. Rating</div>
                    </div>
                    <div className="text-3xl font-bold">{avgRating}/5</div>
                    <div className="text-sm opacity-90">Customer satisfaction</div>
                </motion.div>
            </div>

            {/* Reviews List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Customer Reviews</h3>
                    <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                        <option>All Reviews</option>
                        <option>5 Stars</option>
                        <option>4 Stars</option>
                        <option>3 Stars & Below</option>
                    </select>
                </div>

                <div className="divide-y divide-gray-100">
                    {reviews.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaStar className="text-5xl mx-auto mb-4 opacity-50" />
                            <p>No reviews yet</p>
                        </div>
                    ) : (
                        reviews.map((review, index) => (
                            <motion.div
                                key={review._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-6 hover:bg-gray-50 transition"
                            >
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                            {review.user?.name?.[0] || <FaUser />}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{review.user?.name || 'Anonymous'}</h4>
                                                <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex text-yellow-400 text-sm">
                                                {[...Array(5)].map((_, i) => (
                                                    <FaStar key={i} className={i < review.rating ? "text-yellow-400" : "text-gray-300"} />
                                                ))}
                                            </div>
                                        </div>

                                        {review.dish && (
                                            <div className="flex items-center gap-2 mb-3 bg-gray-100 p-2 rounded-lg w-fit">
                                                {review.dish.imageUrl && (
                                                    <img src={review.dish.imageUrl} alt={review.dish.name} className="w-8 h-8 rounded object-cover" />
                                                )}
                                                <span className="text-xs font-medium text-gray-700">{review.dish.name}</span>
                                            </div>
                                        )}

                                        <div className="relative pl-6">
                                            <FaQuoteLeft className="absolute left-0 top-0 text-gray-300 text-sm" />
                                            <p className="text-gray-600 italic">{review.comment}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
