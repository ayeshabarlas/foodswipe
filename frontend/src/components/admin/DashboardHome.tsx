'use client';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import {
    FaUsers,
    FaStore,
    FaShoppingBag,
    FaChartLine,
    FaMotorcycle,
    FaArrowUp,
    FaCheckCircle,
    FaMoneyBillWave,
    FaTrashAlt
} from 'react-icons/fa';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

interface Stats {
    totalUsers: number;
    totalRestaurants: number;
    pendingRestaurants: number;
    totalOrders: number;
    todayOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    revenueStats: { date: string; revenue: number }[];
    orderStatusDist: { delivered: number; cancelled: number; inProgress: number };
    topRestaurants: any[];
    recentActivity: any[];
    totalRiders: number;
    pendingRiders: number;
    onlineRiders: number;
    avgRiderRating: number;
}

interface DashboardHomeProps {
    stats: Stats | null;
    refreshStats?: () => void;
}

const COLORS = ['#00C49F', '#FFBB28', '#FF8042'];

export default function DashboardHome({ stats, refreshStats }: DashboardHomeProps) {
    const handleCleanupMock = async () => {
        if (!window.confirm('Are you sure you want to delete all mock restaurants and data? This cannot be undone.')) return;
        
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            await axios.post(`${API_BASE_URL}/api/admin/cleanup-mock`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            alert('Mock data cleanup successful! The panel will refresh.');
            if (refreshStats) refreshStats();
        } catch (error) {
            console.error('Cleanup failed:', error);
            alert('Cleanup failed. Please check console for details.');
        }
    };

    // Default stats to prevent UI from vanishing
    const defaultStats: Stats = {
        totalUsers: 0,
        totalRestaurants: 0,
        pendingRestaurants: 0,
        totalOrders: 0,
        todayOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        revenueStats: [],
        orderStatusDist: { delivered: 0, cancelled: 0, inProgress: 0 },
        topRestaurants: [],
        recentActivity: [],
        totalRiders: 0,
        pendingRiders: 0,
        onlineRiders: 0,
        avgRiderRating: 0
    };

    const displayStats = { ...defaultStats, ...(stats || {}) };

    const widgets = [
        {
            label: 'Total Revenue (Today)',
            value: `Rs ${(displayStats.todayRevenue || 0).toLocaleString()}`,
            subValue: `Rs ${(displayStats.totalRevenue || 0).toLocaleString()}`,
            subLabel: 'Total Revenue',
            icon: FaMoneyBillWave,
            color: 'bg-green-100 text-green-600',
            trend: '+12.5%',
            trendColor: 'text-green-500'
        },
        {
            label: 'Total Orders',
            value: displayStats.totalOrders.toLocaleString(),
            subValue: `${displayStats.todayOrders} live orders now`,
            icon: FaShoppingBag,
            color: 'bg-blue-100 text-blue-600',
            trend: '+8.2%',
            trendColor: 'text-blue-500'
        },
        {
            label: 'Active Restaurants',
            value: displayStats.totalRestaurants.toLocaleString(),
            subValue: `${displayStats.pendingRestaurants} pending approval`,
            icon: FaStore,
            color: 'bg-orange-100 text-orange-600',
            trend: `${displayStats.pendingRestaurants} pending`,
            trendColor: 'text-orange-500'
        },
        {
            label: 'Active Riders',
            value: (displayStats.totalRiders || 0).toLocaleString(),
            subValue: `Avg rating: ${(displayStats.avgRiderRating || 0).toFixed(1)}`,
            icon: FaMotorcycle,
            color: 'bg-purple-100 text-purple-600',
            trend: `${displayStats.onlineRiders || 0} online`,
            trendColor: 'text-green-500'
        }
    ];

    const pieData = [
        { name: 'Delivered', value: displayStats.orderStatusDist?.delivered || 0 },
        { name: 'In Progress', value: displayStats.orderStatusDist?.inProgress || 0 },
        { name: 'Cancelled', value: displayStats.orderStatusDist?.cancelled || 0 },
    ];

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Platform Overview</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Real-time statistics and insights</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCleanupMock}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition uppercase tracking-wider"
                        title="Delete Mock Data"
                    >
                        <FaTrashAlt /> Clean Data
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition uppercase tracking-wider">
                        Export Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {widgets.map((w, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                        <div>
                            <p className="text-gray-400 text-[10px] mb-1 font-bold uppercase tracking-wider">{w.label}</p>
                            <h3 className="text-lg font-bold text-gray-800">{w.value}</h3>
                            <div className="flex items-center gap-1 mt-1">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">{w.subLabel}:</span>
                                <span className="text-[9px] font-bold text-gray-700">{w.subValue}</span>
                            </div>
                        </div>
                        <div className={`w-9 h-9 ${w.color} rounded-xl flex items-center justify-center`}>
                            <w.icon className="text-base" />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-base font-bold text-gray-800">Revenue Overview</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Last 7 days performance</p>
                        </div>
                        <select className="px-2 py-1 border rounded-lg text-xs text-gray-600 outline-none font-bold">
                            <option>Last 7 days</option>
                        </select>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={displayStats.revenueStats || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#F97316"
                                    strokeWidth={2}
                                    dot={{ fill: '#F97316', strokeWidth: 1, r: 3, stroke: '#fff' }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Order Status Pie Chart */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-base font-bold text-gray-800 mb-0.5">Order Status</h3>
                    <p className="text-[10px] text-gray-500 mb-6 uppercase font-bold tracking-wider">This week distribution</p>
                    <div className="h-56 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-800">
                                    {Math.round(((displayStats.orderStatusDist?.delivered || 0) / (displayStats.totalOrders || 1)) * 100)}%
                                </p>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Completed</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performing Restaurants */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold text-gray-800">Top Performing Restaurants</h3>
                        <button className="text-[10px] text-orange-500 font-bold hover:text-orange-600 uppercase tracking-wider">View All</button>
                    </div>
                    <div className="space-y-3">
                        {(displayStats.topRestaurants || []).map((restaurant, index) => (
                            <div key={index} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs
                                        ${index === 0 ? 'bg-orange-500' :
                                            index === 1 ? 'bg-orange-400' :
                                                index === 2 ? 'bg-orange-300' : 'bg-gray-300'}`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-xs">{restaurant.name}</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">{restaurant.orders} orders</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800 text-xs">Rs {restaurant.revenue.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">â­ {restaurant.rating.toFixed(1)}</p>
                                </div>
                            </div>
                        ))}
                        {(displayStats.topRestaurants || []).length === 0 && (
                            <div className="text-center py-6 text-[10px] text-gray-500 font-bold uppercase">No data available</div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold text-gray-800">Recent Activity</h3>
                        <button className="text-[10px] text-orange-500 font-bold hover:text-orange-600 uppercase tracking-wider">View All</button>
                    </div>
                    <div className="space-y-4">
                        {(displayStats.recentActivity || []).map((activity, index) => (
                            <div key={index} className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm
                                    ${activity.type === 'order' ? 'bg-green-100 text-green-500' :
                                        activity.type === 'restaurant_approval' ? 'bg-blue-100 text-blue-500' :
                                            'bg-orange-100 text-orange-500'}`}>
                                    {activity.type === 'order' ? <FaShoppingBag /> :
                                        activity.type === 'restaurant_approval' ? <FaStore /> : <FaMotorcycle />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-xs">{activity.text}</h4>
                                    <p className="text-[10px] text-gray-500 font-bold">{activity.subtext}</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                                        {new Date(activity.time).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {displayStats.recentActivity.length === 0 && (
                            <div className="text-center py-6 text-[10px] text-gray-500 font-bold uppercase">No recent activity</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
