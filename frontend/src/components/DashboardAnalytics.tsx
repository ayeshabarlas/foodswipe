'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaEye, FaHeart, FaShare, FaShoppingBag, FaMousePointer, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import axios from 'axios';

interface AnalyticsData {
    overview: {
        totalViews: number;
        totalLikes: number;
        totalShares: number;
        profileVisits: number;
        orderClicks: number;
        addToCartClicks: number;
        totalOrders: number;
        totalReviews: number;
    };
    viewsHistory: { date: string; views: number }[];
    topVideos: {
        _id: string;
        title: string;
        views: number;
        likes: string[];
        shares: number;
        orderClicks: number;
    }[];
}

export default function DashboardAnalytics({ restaurantId }: { restaurantId: string }) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        if (!restaurantId) return;

        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const analyticsRes = await axios.get(`http://localhost:5000/api/restaurants/${restaurantId}/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(analyticsRes.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [restaurantId]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
    }

    if (!data) {
        return <div className="p-8 text-center text-gray-500">No analytics data available.</div>;
    }

    const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</h3>
                </div>
                <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                    <Icon className={`text-xl ${color.replace('bg-', 'text-')}`} />
                </div>
            </div>
            {trend && (
                <div className={`flex items-center text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend > 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                    {Math.abs(trend)}% vs last week
                </div>
            )}
        </motion.div>
    );

    // Calculate max views for chart scaling
    const maxViews = Math.max(...(data.viewsHistory.map(h => h.views) || [0]), 10);

    return (
        <div className="p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
                <p className="text-gray-500 text-sm">Real-time performance metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Reviews"
                    value={data.overview.totalReviews || 0}
                    icon={FaHeart}
                    color="bg-pink-500"
                />
                <StatCard
                    title="Total Views"
                    value={data.overview.totalViews}
                    icon={FaEye}
                    color="bg-blue-500"
                    trend={12}
                />
                <StatCard
                    title="Total Orders"
                    value={data.overview.totalOrders}
                    icon={FaShoppingBag}
                    color="bg-orange-500"
                    trend={8}
                />
                <StatCard
                    title="Profile Visits"
                    value={data.overview.profileVisits}
                    icon={FaMousePointer}
                    color="bg-purple-500"
                    trend={-2}
                />
                <StatCard
                    title="Engagement"
                    value={data.overview.totalLikes + data.overview.totalShares}
                    icon={FaHeart}
                    color="bg-red-500"
                    trend={5}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Views Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900">Views History</h3>
                        <select className="text-sm border-gray-200 rounded-lg text-gray-500">
                            <option>Last 30 Days</option>
                            <option>Last 7 Days</option>
                        </select>
                    </div>

                    <div className="h-64 flex items-end justify-between gap-2">
                        {data.viewsHistory.length > 0 ? (
                            data.viewsHistory.map((item, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-blue-100 rounded-t-lg hover:bg-blue-500 transition-all relative group-hover:shadow-lg"
                                        style={{ height: `${(item.views / maxViews) * 100}%`, minHeight: '4px' }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                                            {item.views} views
                                            <div className="text-[10px] opacity-75">{new Date(item.date).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                No history data available yet
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-gray-400 border-t border-gray-100 pt-4">
                        <span>30 days ago</span>
                        <span>Today</span>
                    </div>
                </motion.div>

                {/* Top Videos */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <h3 className="font-bold text-gray-900 mb-6">Top Performing Videos</h3>
                    <div className="space-y-4">
                        {data.topVideos.length > 0 ? (
                            data.topVideos.map((video, index) => (
                                <div key={video._id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
                                    <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 bg-gray-100 rounded-lg text-sm">
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 truncate text-sm">{video.title || 'Untitled Video'}</h4>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1"><FaEye /> {video.views}</span>
                                            <span className="flex items-center gap-1"><FaHeart /> {video.likes.length}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-green-600">{video.orderClicks}</div>
                                        <div className="text-[10px] text-gray-400">clicks</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                No videos uploaded yet
                            </div>
                        )}
                    </div>
                    <button className="w-full mt-6 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition">
                        View All Content
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
