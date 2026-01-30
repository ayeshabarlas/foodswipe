'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    FaShoppingBag, FaWallet, FaChartLine, FaClock, 
    FaCheck, FaPaperPlane, FaArrowUp, FaArrowDown,
    FaUtensils, FaStar
} from 'react-icons/fa';

interface DashboardOverviewProps {
    stats: {
        isOnline: boolean;
        ordersToday: number;
        netEarningsToday: number;
        commissionToday: number;
        [key: string]: any;
    };
    restaurant: {
        owner: {
            name: string;
        };
        [key: string]: any;
    };
}

export default function DashboardOverview({ stats, restaurant }: DashboardOverviewProps) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {/* Professional Under Approval / Profile Completion Banner */}
            {((restaurant?.verificationStatus !== 'verified' && restaurant?.verificationStatus !== 'approved') || !restaurant?.isVerified) && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-sm"
                >
                    <div className="relative px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center shrink-0 border border-orange-100/50">
                                {restaurant?.verificationStatus === 'new' ? (
                                    <FaUtensils className="text-orange-500 text-2xl" />
                                ) : (
                                    <FaClock className="text-orange-500 text-2xl animate-pulse" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-light text-gray-900 tracking-tight mb-1">
                                    {restaurant?.verificationStatus === 'new' ? 'Complete Your Store Setup' : 'Profile Under Review'}
                                </h3>
                                <p className="text-[13px] font-light text-gray-500 leading-relaxed max-w-lg">
                                    {restaurant?.verificationStatus === 'new' 
                                        ? 'Your restaurant is almost ready! Complete your address and upload documents to start receiving orders.'
                                        : 'Our team is currently verifying your documents and store details. We\'ll notify you once you\'re live!'}
                                </p>
                                
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                        <div className={`w-1.5 h-1.5 rounded-full ${restaurant?.verificationStatus === 'new' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                                        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-widest">
                                            {restaurant?.verificationStatus === 'new' ? 'Action Required' : 'Verification Pending'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                                        Estimated Time: 24h
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <button 
                                onClick={() => {
                                    if (restaurant?.verificationStatus === 'new') {
                                        window.location.href = '/restaurant/dashboard?page=store';
                                    } else {
                                        window.location.href = '/restaurant-registration';
                                    }
                                }}
                                className="bg-orange-500 text-white px-8 py-3.5 rounded-2xl text-[13px] font-medium whitespace-nowrap hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 tracking-wide"
                            >
                                {restaurant?.verificationStatus === 'new' ? 'Complete Now' : 'Check Details'}
                            </button>
                            <button 
                                onClick={() => window.location.href = '/restaurant/dashboard?page=support'}
                                className="bg-white text-gray-600 border border-gray-200 px-6 py-3.5 rounded-2xl text-[13px] font-medium whitespace-nowrap hover:bg-gray-50 transition-all active:scale-95 tracking-wide"
                            >
                                Contact Support
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
                    <p className="text-gray-500 text-sm font-medium">
                        Welcome back, <span className="text-orange-600">{restaurant?.owner?.name || 'Partner'}</span>! Here's what's happening today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stats?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            {stats?.isOnline ? 'Store Online' : 'Store Offline'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <motion.div variants={itemVariants} className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-[32px] p-6 shadow-lg shadow-orange-500/20 text-white hover:shadow-xl hover:shadow-orange-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:scale-110 transition-transform">
                            <FaShoppingBag size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md">Today</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1 relative z-10">{stats?.ordersToday || 0}</h3>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-widest relative z-10">Total Orders</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] p-6 shadow-lg shadow-emerald-500/20 text-white hover:shadow-xl hover:shadow-emerald-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:scale-110 transition-transform">
                            <FaWallet size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md">Today</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1 relative z-10">Rs. {Math.round(stats?.netEarningsToday || 0).toLocaleString()}</h3>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-widest relative z-10">Net Revenue</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[32px] p-6 shadow-lg shadow-blue-500/20 text-white hover:shadow-xl hover:shadow-blue-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:scale-110 transition-transform">
                            <FaChartLine size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md">Today</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1 relative z-10">Rs. {Math.round(stats?.commissionToday || 0).toLocaleString()}</h3>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-widest relative z-10">Commission</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[32px] p-6 shadow-lg shadow-amber-500/20 text-white hover:shadow-xl hover:shadow-amber-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:scale-110 transition-transform">
                            <FaStar size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md">Rating</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1 relative z-10">{restaurant?.rating ? Number(restaurant.rating).toFixed(1) : '0.0'}</h3>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-widest relative z-10">Avg Review</p>
                </motion.div>
            </motion.div>

            {/* Weekly Performance Quick View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
                            <FaChartLine size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weekly Revenue</p>
                            <h4 className="text-xl font-bold text-gray-900">Rs. {(stats?.weeklyRevenue || 0).toLocaleString()}</h4>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">This Week</p>
                        <p className="text-xs font-bold text-green-500">{(stats?.weeklyOrders || 0)} Orders</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                            <FaWallet size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weekly Net Payout</p>
                            <h4 className="text-xl font-bold text-emerald-600">Rs. {(stats?.weeklyNetEarnings || 0).toLocaleString()}</h4>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Est. Payout</p>
                        <p className="text-xs font-bold text-gray-500">Next Friday</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Order Status Summary */}
                <motion.div 
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="lg:col-span-2 bg-white rounded-[40px] p-8 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Current Order Status</h3>
                            <p className="text-sm text-gray-500">Real-time status of active orders</p>
                        </div>
                        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                            <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-[10px] font-bold text-orange-600 uppercase tracking-wider">Live</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {[
                            { label: 'Pending', count: stats?.pending || 0, color: 'orange', icon: FaClock },
                            { label: 'Preparing', count: stats?.preparing || 0, color: 'blue', icon: FaUtensils },
                            { label: 'Ready', count: stats?.ready || 0, color: 'green', icon: FaCheck },
                            { label: 'On Way', count: stats?.outForDelivery || 0, color: 'purple', icon: FaPaperPlane },
                        ].map((status, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                                <div className={`w-16 h-16 bg-${status.color}-50 rounded-3xl flex items-center justify-center text-${status.color}-500 mb-4 border border-${status.color}-100/50 shadow-sm`}>
                                    <status.icon size={24} />
                                </div>
                                <h4 className="text-2xl font-bold text-gray-900 mb-1">{status.count}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{status.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-6 bg-gradient-to-r from-gray-50 to-white rounded-[32px] border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                                <FaChartLine size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Weekly Performance</p>
                                <p className="text-xs text-gray-500">Your store is doing 15% better than last week</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-green-500 font-bold text-sm">
                            <FaArrowUp /> 15%
                        </div>
                    </div>
                </motion.div>

                {/* Top Selling Items */}
                <motion.div 
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100"
                >
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-900">Top Selling Items</h3>
                        <p className="text-sm text-gray-500">Most popular dishes this week</p>
                    </div>

                    <div className="space-y-6">
                        {stats?.topItems && stats.topItems.length > 0 ? (
                            stats.topItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 font-bold text-lg group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{item.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.count} Orders</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">Rs. {item.revenue?.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                                    <FaUtensils size={24} />
                                </div>
                                <p className="text-sm font-medium text-gray-400">No data available yet</p>
                            </div>
                        )}
                    </div>

                    <button className="w-full mt-8 py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-colors">
                        View Detailed Report
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
