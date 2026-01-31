'use client';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getApiUrl } from '../../utils/config';
import {
    FaUsers,
    FaStore,
    FaShoppingBag,
    FaChartLine,
    FaMotorcycle,
    FaArrowUp,
    FaCheckCircle,
    FaMoneyBillWave,
    FaTrashAlt,
    FaWallet,
    FaPercentage,
    FaStar,
    FaCalculator,
    FaExclamationTriangle
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
    totalCommission: number;
    totalRiderEarnings: number;
    totalDeliveryFees: number;
    netPlatformProfit: number;
    totalPendingPayouts: number;
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
    statsError?: string | null;
    refreshStats?: () => void;
}

const COLORS = ['#FF6A00', '#10B981', '#F59E0B'];

export default function DashboardHome({ stats, statsError, refreshStats }: DashboardHomeProps) {
    const handleCleanupMock = async () => {
        if (!window.confirm('Are you sure you want to delete all mock restaurants and data? This cannot be undone.')) return;
        
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;
            
            await axios.post(`${getApiUrl()}/api/admin/cleanup-mock`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            alert('Mock data cleanup successful! The panel will refresh.');
            if (refreshStats) refreshStats();
        } catch (error: any) {
            console.error('Cleanup failed:', error);
            alert(`Cleanup failed: ${error.response?.data?.message || error.message}`);
        }
    };

    const defaultStats: Stats = {
        totalUsers: 0,
        totalRestaurants: 0,
        pendingRestaurants: 0,
        totalOrders: 0,
        todayOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        totalCommission: 0,
        totalRiderEarnings: 0,
        totalDeliveryFees: 0,
        netPlatformProfit: 0,
        totalPendingPayouts: 0,
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

    const hasData = displayStats.totalUsers > 0 || displayStats.totalRestaurants > 0 || displayStats.totalOrders > 0;

    const widgets = [
        {
            label: 'Total Revenue',
            value: `Rs. ${(displayStats.totalRevenue || 0).toLocaleString()}`,
            subValue: `Rs. ${(displayStats.todayRevenue || 0).toLocaleString()}`,
            subLabel: 'Today Sales',
            icon: FaMoneyBillWave,
            color: 'bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg shadow-gray-900/20',
            trend: 'Gross',
            trendColor: 'text-gray-400'
        },
        {
            label: 'Remaining (Total - Rider)',
            value: `Rs. ${(displayStats.totalRevenue - (displayStats.totalRiderEarnings || 0)).toLocaleString()}`,
            subValue: `Rider: Rs. ${(displayStats.totalRiderEarnings || 0).toLocaleString()}`,
            subLabel: 'Deducted',
            icon: FaCalculator,
            color: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20',
            trend: 'Rest',
            trendColor: 'text-blue-200'
        },
        {
            label: 'Net Platform Profit',
            value: `Rs. ${(displayStats.netPlatformProfit || 0).toLocaleString()}`,
            subValue: `Comm: Rs. ${(displayStats.totalCommission || 0).toLocaleString()}`,
            subLabel: 'Incl. Delivery Margin',
            icon: FaWallet,
            color: 'bg-gradient-to-br from-[#FF6A00] to-pink-500 text-white shadow-lg shadow-orange-500/20',
            trend: 'Profit',
            trendColor: 'text-orange-200'
        },
        {
            label: 'Total Orders',
            value: displayStats.totalOrders.toLocaleString(),
            subValue: `${displayStats.todayOrders} new today`,
            subLabel: 'Order Count',
            icon: FaShoppingBag,
            color: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20',
            trend: 'Orders',
            trendColor: 'text-emerald-200'
        }
    ];

    const pieData = [
        { name: 'Delivered', value: displayStats.orderStatusDist?.delivered || 0 },
        { name: 'In Progress', value: displayStats.orderStatusDist?.inProgress || 0 },
        { name: 'Cancelled', value: displayStats.orderStatusDist?.cancelled || 0 },
    ];

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading Dashboard Data...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto font-sans">
            {statsError && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between"
                >
                    <div className="flex items-center gap-3 text-red-700">
                        <FaExclamationTriangle />
                        <span className="text-sm font-bold">API Error: {statsError}</span>
                    </div>
                    <button 
                        onClick={refreshStats}
                        className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors"
                    >
                        Retry Fetch
                    </button>
                </motion.div>
            )}

            {!hasData && !statsError && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-3 text-orange-700"
                >
                    {stats === null ? (
                        <>
                            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-bold">Loading dashboard data...</span>
                        </>
                    ) : (
                        <>
                            <FaExclamationTriangle />
                            <span className="text-sm font-bold">Note: No active data found in the system yet.</span>
                        </>
                    )}
                </motion.div>
            )}

            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[24px] font-bold text-[#111827] tracking-tight">Dashboard Overview</h2>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                    <p className="text-[14px] font-medium text-[#6B7280] mt-1">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleCleanupMock}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white text-red-600 rounded-xl text-[13px] font-bold hover:bg-red-50 transition-all uppercase tracking-widest shadow-sm active:scale-95 border border-red-100"
                    >
                        <FaTrashAlt className="text-sm" /> Clean Data
                    </button>
                    <button className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-[13px] font-bold hover:shadow-xl hover:shadow-orange-500/30 transition-all shadow-lg active:scale-95 uppercase tracking-widest">
                        <FaChartLine className="text-sm" /> Export Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {widgets.map((w, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`${w.color} p-8 rounded-[2rem] shadow-xl relative overflow-hidden group active:scale-[0.98] transition-all cursor-default`}
                    >
                        {/* Decorative background elements */}
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-black/5 rounded-full blur-xl group-hover:bg-black/10 transition-all"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <p className="text-white/70 text-[11px] font-bold uppercase tracking-[0.15em] mb-2">{w.label}</p>
                                <h3 className="text-[28px] font-bold text-white tracking-tight leading-none mb-4">{w.value}</h3>
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg border border-white/10">
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{w.subLabel}</span>
                                    </div>
                                    <span className="text-[12px] font-bold text-white/90">{w.subValue}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                                    <w.icon className="text-xl" />
                                </div>
                                <div className="px-3 py-1 bg-black/10 rounded-full backdrop-blur-sm">
                                    <span className="text-[11px] font-bold text-white/80">{w.trend}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">Revenue Analytics</h3>
                            <p className="text-[13px] font-medium text-[#9CA3AF] uppercase tracking-wider mt-1">Last 7 days performance</p>
                        </div>
                        <select className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[13px] text-[#111827] outline-none font-bold focus:ring-2 focus:ring-[#FF6A00]/20 transition-all cursor-pointer">
                            <option>Last 7 days</option>
                            <option>Last 30 days</option>
                        </select>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={displayStats.revenueStats || []}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#FF6A00" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                                    tickFormatter={(val) => `Rs.${val > 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                                />
                                <Tooltip
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                                        fontSize: '12px',
                                        fontWeight: 500
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#FF6A00"
                                    strokeWidth={3}
                                    dot={{ fill: '#FF6A00', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Order Status Pie Chart */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-[18px] font-bold text-[#111827] mb-1 tracking-tight">Order Status</h3>
                    <p className="text-[13px] font-medium text-[#9CA3AF] mb-8 uppercase tracking-wider">Weekly distribution</p>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-9">
                            <div className="text-center">
                                <p className="text-[26px] font-bold text-[#111827] tracking-tight">
                                    {Math.round(((displayStats.orderStatusDist?.delivered || 0) / (displayStats.totalOrders || 1)) * 100)}%
                                </p>
                                <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Success</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Performing Restaurants */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">Top Sellers</h3>
                            <p className="text-[13px] font-medium text-[#9CA3AF] uppercase tracking-wider mt-1">Highest performing vendors</p>
                        </div>
                        <button className="text-[13px] text-[#FF6A00] font-bold hover:underline uppercase tracking-wider">View All</button>
                    </div>
                    <div className="space-y-4">
                        {(displayStats.topRestaurants || []).map((restaurant, index) => (
                            <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50/50 rounded-[1.5rem] border border-transparent hover:border-gray-100 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm
                                        ${index === 0 ? 'bg-yellow-400 shadow-lg shadow-yellow-400/20' :
                                            index === 1 ? 'bg-slate-300 shadow-lg shadow-slate-300/20' :
                                                index === 2 ? 'bg-amber-600 shadow-lg shadow-amber-600/20' : 'bg-gray-100 text-[#9CA3AF]'}`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#111827] text-[15px] group-hover:text-[#FF6A00] transition-colors tracking-tight">{restaurant.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[12px] font-medium text-[#6B7280]">{restaurant.orders} Orders</span>
                                            <span className="text-gray-300">•</span>
                                            <div className="flex items-center gap-1 text-[12px] text-yellow-500 font-bold">
                                                <FaStar size={10} /> {restaurant.rating.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-[#111827] text-[15px] tracking-tight">Rs. {restaurant.revenue.toLocaleString()}</p>
                                    <p className="text-[11px] text-emerald-500 font-bold mt-0.5 flex items-center justify-end gap-1">
                                        <FaArrowUp size={8} /> 12%
                                    </p>
                                </div>
                            </div>
                        ))}
                        {(displayStats.topRestaurants || []).length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-[14px] font-medium text-[#6B7280]">No vendor data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">Recent Activity</h3>
                            <p className="text-[13px] font-medium text-[#9CA3AF] uppercase tracking-wider mt-1">Latest platform events</p>
                        </div>
                        <button className="text-[13px] text-[#6B7280] font-bold hover:text-[#111827] uppercase tracking-wider">Live Log</button>
                    </div>
                    <div className="space-y-6">
                        {(displayStats.recentActivity || []).map((activity, index) => (
                            <div key={index} className="flex gap-4 relative">
                                {index !== displayStats.recentActivity.length - 1 && (
                                    <div className="absolute left-5 top-10 bottom-0 w-[2px] bg-gray-50"></div>
                                )}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm shadow-sm
                                    ${activity.type === 'order' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' :
                                        activity.type === 'restaurant_approval' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                                            'bg-orange-50 text-[#FF6A00] border border-orange-100'}`}>
                                    {activity.type === 'order' ? <FaShoppingBag /> :
                                        activity.type === 'restaurant_approval' ? <FaStore /> : <FaMotorcycle />}
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <h4 className="font-bold text-[#111827] text-[14px] leading-tight tracking-tight">{activity.text}</h4>
                                    <p className="text-[13px] font-medium text-[#6B7280] mt-1">{activity.subtext}</p>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                                        <span>{new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="text-gray-200">•</span>
                                        <span>{new Date(activity.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {displayStats.recentActivity.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-[14px] font-medium text-[#6B7280]">No recent activity found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

