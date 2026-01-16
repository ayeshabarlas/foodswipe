'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaChartLine, FaShoppingBag, FaMoneyBillWave, FaUsers, FaStore, FaMotorcycle } from 'react-icons/fa';

interface AnalyticsData {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalRestaurants: number;
    totalRiders: number;
    avgOrderValue: number;
    todayRevenue: number;
    todayOrders: number;
    monthlyRevenue: number[];
    monthlyOrders: number[];
    topRestaurants: { name: string; revenue: number; orders: number }[];
}

export default function AnalyticsView() {
    const [analytics, setAnalytics] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();

        const socket = io(SOCKET_URL);
        socket.on('order_created', fetchAnalytics);
        socket.on('order_updated', fetchAnalytics);
        socket.on('restaurant_updated', fetchAnalytics);

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchAnalytics = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            const res = await axios.get(`${API_BASE_URL}/api/admin/stats`, config);
            setAnalytics(res.data);
        } catch (err: any) {
            console.error('❌ Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `Rs. ${(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">Analytics Dashboard</h1>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Real-time business insights and platform performance metrics</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-[#6B7280] hover:bg-gray-50 transition-all uppercase tracking-wider">
                        Download Report
                    </button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6A00]/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-[#FF6A00]">
                            <FaMoneyBillWave className="text-xl" />
                        </div>
                        <div className="text-right">
                            <p className="text-[#6B7280] text-[13px] font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                            <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{formatCurrency(analytics.totalRevenue)}</h3>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                        <span className="text-[12px] text-[#9CA3AF] font-medium uppercase tracking-wider">Today's Revenue</span>
                        <span className="text-[14px] font-bold text-emerald-500">{formatCurrency(analytics.todayRevenue)}</span>
                    </div>
                </div>

                {/* Orders Card */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                            <FaShoppingBag className="text-xl" />
                        </div>
                        <div className="text-right">
                            <p className="text-[#6B7280] text-[13px] font-bold uppercase tracking-wider mb-1">Total Orders</p>
                            <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{analytics.totalOrders}</h3>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                        <span className="text-[12px] text-[#9CA3AF] font-medium uppercase tracking-wider">Today's Orders</span>
                        <span className="text-[14px] font-bold text-blue-500">{analytics.todayOrders} Orders</span>
                    </div>
                </div>

                {/* AOV Card */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                            <FaChartLine className="text-xl" />
                        </div>
                        <div className="text-right">
                            <p className="text-[#6B7280] text-[13px] font-bold uppercase tracking-wider mb-1">Avg Order Value</p>
                            <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{formatCurrency(analytics.avgOrderValue)}</h3>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                        <span className="text-[12px] text-[#9CA3AF] font-medium uppercase tracking-wider">Per Order Avg</span>
                        <span className="text-[14px] font-bold text-purple-600">Stable</span>
                    </div>
                </div>
            </div>

            {/* Platform Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Total Customers</p>
                        <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{analytics.totalCustomers}</h3>
                    </div>
                    <div className="bg-orange-50 w-14 h-14 rounded-2xl flex items-center justify-center text-[#FF6A00] group-hover:scale-110 transition-transform">
                        <FaUsers className="text-2xl" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Total Restaurants</p>
                        <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{analytics.totalRestaurants}</h3>
                    </div>
                    <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                        <FaStore className="text-2xl" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div>
                        <p className="text-[#6B7280] text-[13px] uppercase font-bold mb-2 tracking-wider">Total Riders</p>
                        <h3 className="text-[26px] font-bold text-[#111827] tracking-tight">{analytics.totalRiders}</h3>
                    </div>
                    <div className="bg-purple-50 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        <FaMotorcycle className="text-2xl" />
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-[16px] font-bold text-[#111827] mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full"></div>
                        Monthly Revenue Trend
                    </h3>
                    <div className="h-64 flex flex-col items-center justify-center bg-gray-50/50 rounded-[1.5rem] border border-dashed border-gray-200">
                        <FaChartLine className="text-3xl text-[#9CA3AF] mb-3 opacity-20" />
                        <p className="text-[#9CA3AF] text-[13px] font-medium uppercase tracking-wider">Visualization coming soon</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-[16px] font-bold text-[#111827] mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                        Order Volume Trend
                    </h3>
                    <div className="h-64 flex flex-col items-center justify-center bg-gray-50/50 rounded-[1.5rem] border border-dashed border-gray-200">
                        <FaShoppingBag className="text-3xl text-[#9CA3AF] mb-3 opacity-20" />
                        <p className="text-[#9CA3AF] text-[13px] font-medium uppercase tracking-wider">Visualization coming soon</p>
                    </div>
                </div>
            </div>

            {/* Top Restaurants Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50">
                    <h3 className="text-[16px] font-bold text-[#111827] flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                        Top Performing Restaurants
                    </h3>
                </div>
                {analytics.topRestaurants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#9CA3AF]">
                        <FaStore className="text-4xl mb-3 opacity-10" />
                        <p className="text-[14px] font-medium">No performance data available yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Rank</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Restaurant</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Revenue</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Orders</th>
                                    <th className="px-8 py-5 text-right text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Growth</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {analytics.topRestaurants.map((restaurant, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm
                                                ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-amber-600' : 'bg-gray-100 text-[#9CA3AF]'}`}>
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="font-bold text-[#111827] text-[14px] group-hover:text-[#FF6A00] transition-colors">{restaurant.name}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="font-bold text-emerald-600 text-[14px]">{formatCurrency(restaurant.revenue)}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[#6B7280] font-bold text-[13px]">{restaurant.orders} Orders</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-[12px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-wider">
                                                +12.5%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
