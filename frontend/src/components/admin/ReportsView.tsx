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
        return `Rs ${(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">Business insights and performance metrics</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <FaMoneyBillWave className="text-4xl opacity-80" />
                        <div className="text-right">
                            <p className="text-white/80 text-sm">Total Revenue</p>
                            <p className="text-3xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
                        </div>
                    </div>
                    <div className="text-sm opacity-80">
                        Today: {formatCurrency(analytics.todayRevenue)}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <FaShoppingBag className="text-4xl opacity-80" />
                        <div className="text-right">
                            <p className="text-white/80 text-sm">Total Orders</p>
                            <p className="text-3xl font-bold">{analytics.totalOrders}</p>
                        </div>
                    </div>
                    <div className="text-sm opacity-80">
                        Today: {analytics.todayOrders} orders
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <FaChartLine className="text-4xl opacity-80" />
                        <div className="text-right">
                            <p className="text-white/80 text-sm">Avg Order Value</p>
                            <p className="text-3xl font-bold">{formatCurrency(analytics.avgOrderValue)}</p>
                        </div>
                    </div>
                    <div className="text-sm opacity-80">
                        Per order average
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Customers</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{analytics.totalCustomers}</p>
                        </div>
                        <FaUsers className="text-orange-500 text-3xl" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Restaurants</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{analytics.totalRestaurants}</p>
                        </div>
                        <FaStore className="text-blue-500 text-3xl" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Riders</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{analytics.totalRiders}</p>
                        </div>
                        <FaMotorcycle className="text-purple-500 text-3xl" />
                    </div>
                </div>
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Revenue Trend</h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Chart visualization coming soon</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Volume Trend</h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Chart visualization coming soon</p>
                    </div>
                </div>
            </div>

            {/* Top Restaurants */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Restaurants</h3>
                {analytics.topRestaurants.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>No data available yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {analytics.topRestaurants.map((restaurant, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900">{restaurant.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-green-600">{formatCurrency(restaurant.revenue)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-600">{restaurant.orders} orders</span>
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
