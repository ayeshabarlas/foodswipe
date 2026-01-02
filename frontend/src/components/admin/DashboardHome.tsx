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
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                    <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={handleCleanupMock}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition border border-red-100 text-sm font-medium"
                        title="Remove all mock data"
                    >
                        <FaTrashAlt /> Clean Mock Data
                    </button>
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-sm font-medium text-gray-600">Live Updates Active</span>
                    </div>
                </div>
            </div>

            {/* Stats Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {widgets.map((widget, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${widget.color}`}>
                                <widget.icon className="text-xl" />
                            </div>
                            <span className={`text-xs font-bold ${widget.trendColor}`}>
                                {widget.trend}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-1">{widget.value}</h3>
                        <p className="text-sm text-gray-500 mb-2">{widget.label}</p>
                        <p className="text-xs text-gray-400">{widget.subValue}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Revenue Overview</h3>
                            <p className="text-sm text-gray-500">Last 7 days performance</p>
                        </div>
                        <select className="px-3 py-1 border rounded-lg text-sm text-gray-600 outline-none">
                            <option>Last 7 days</option>
                        </select>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={displayStats.revenueStats || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#F97316"
                                    strokeWidth={3}
                                    dot={{ fill: '#F97316', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Order Status Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Order Status</h3>
                    <p className="text-sm text-gray-500 mb-6">This week distribution</p>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-800">
                                    {Math.round(((displayStats.orderStatusDist?.delivered || 0) / (displayStats.totalOrders || 1)) * 100)}%
                                </p>
                                <p className="text-xs text-gray-500">Completed</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performing Restaurants */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Top Performing Restaurants</h3>
                        <button className="text-sm text-orange-500 font-medium hover:text-orange-600">View All</button>
                    </div>
                    <div className="space-y-4">
                        {(displayStats.topRestaurants || []).map((restaurant, index) => (
                            <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm
                                        ${index === 0 ? 'bg-orange-500' :
                                            index === 1 ? 'bg-orange-400' :
                                                index === 2 ? 'bg-orange-300' : 'bg-gray-300'}`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{restaurant.name}</h4>
                                        <p className="text-xs text-gray-500">{restaurant.orders} orders</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800">Rs {restaurant.revenue.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 animate-pulse">⭐ {restaurant.rating.toFixed(1)}</p>
                                </div>
                            </div>
                        ))}
                        {(displayStats.topRestaurants || []).length === 0 && (
                            <div className="text-center py-8 text-gray-500">No data available</div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Recent Activity</h3>
                        <button className="text-sm text-orange-500 font-medium hover:text-orange-600">View All</button>
                    </div>
                    <div className="space-y-6">
                        {(displayStats.recentActivity || []).map((activity, index) => (
                            <div key={index} className="flex gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                                    ${activity.type === 'order' ? 'bg-green-100 text-green-500' :
                                        activity.type === 'restaurant_approval' ? 'bg-blue-100 text-blue-500' :
                                            'bg-orange-100 text-orange-500'}`}>
                                    {activity.type === 'order' ? <FaShoppingBag /> :
                                        activity.type === 'restaurant_approval' ? <FaStore /> : <FaMotorcycle />}
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-800">{activity.text}</h4>
                                    <p className="text-sm text-gray-500">{activity.subtext}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(activity.time).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {displayStats.recentActivity.length === 0 && (
                            <div className="text-center py-8 text-gray-500">No recent activity</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
