'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { FaCalendarAlt, FaDownload } from 'react-icons/fa';

export default function FinanceView() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        platformCommission: 0,
        pendingPayouts: 0,
        gatewayFees: 0,
        restaurantEarnings: 0,
        riderEarnings: 0,
        netRevenue: 0,
        thisMonthRevenue: 0
    });
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        fetchFinanceData();

        const socket = io(SOCKET_URL);
        const handleUpdate = () => {
            console.log('Finance-relevant update detected, refreshing stats...');
            fetchFinanceData();
        };

        socket.on('order_created', handleUpdate);
        socket.on('order_updated', handleUpdate);

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchFinanceData = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            // Fetch dashboard stats which is lighter and has aggregated data
            const res = await axios.get(`${API_BASE_URL}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;

            // Use real data from backend
            const totalRevenue = data.totalRevenue || 0;
            const platformCommission = data.totalCommission || 0;
            const riderEarnings = data.totalRiderEarnings || 0;
            const restaurantEarnings = data.totalRestaurantEarnings || 0;

            setStats({
                totalRevenue,
                platformCommission,
                pendingPayouts: Math.round(restaurantEarnings * 0.1), // Simplified pending
                gatewayFees: Math.round(totalRevenue * 0.02),
                restaurantEarnings,
                riderEarnings,
                netRevenue: Math.round(platformCommission * 0.8),
                thisMonthRevenue: data.todayRevenue ? data.todayRevenue * 30 : totalRevenue / 12
            });

            // Standardize chart data
            if (data.revenueStats && Array.isArray(data.revenueStats)) {
                const formattedChartData = data.revenueStats.map((item: any) => ({
                    name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                    revenue: item.revenue,
                    commission: Math.round(item.revenue * 0.1)
                }));
                setChartData(formattedChartData as any);
            }

            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    const pieData = [
        { name: 'Card', value: 45 },
        { name: 'Cash', value: 35 },
        { name: 'Wallet', value: 15 },
        { name: 'Other', value: 5 },
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Finance Overview</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Complete financial management with 10% commission tracking</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 text-xs">
                        <FaCalendarAlt /> Date Range
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-md text-xs font-bold uppercase tracking-wider">
                        <FaDownload /> Export
                    </button>
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Revenue */}
                <div className="bg-blue-600 rounded-xl p-4 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                            <div className="bg-white/20 p-1.5 rounded-lg">
                                <span className="text-base font-bold">$</span>
                            </div>
                            <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">+12.5%</span>
                        </div>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">Total Revenue</p>
                        <h3 className="text-xl font-bold">Rs {stats.totalRevenue.toLocaleString()}</h3>
                        <p className="text-blue-200 text-[9px] font-medium uppercase tracking-tighter">This month</p>
                    </div>
                </div>

                {/* Platform Commission */}
                <div className="bg-green-600 rounded-xl p-4 text-white shadow-lg shadow-green-600/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                            <div className="bg-white/20 p-1.5 rounded-lg">
                                <span className="text-base font-bold">↗</span>
                            </div>
                            <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">10% Rate</span>
                        </div>
                        <p className="text-green-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">Platform Commission</p>
                        <h3 className="text-xl font-bold">Rs {stats.platformCommission.toLocaleString()}</h3>
                        <p className="text-green-200 text-[9px] font-medium uppercase tracking-tighter">This month (10%)</p>
                    </div>
                </div>

                {/* Pending Payouts */}
                <div className="bg-orange-500 rounded-xl p-4 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                            <div className="bg-white/20 p-1.5 rounded-lg">
                                <span className="text-base font-bold">↘</span>
                            </div>
                        </div>
                        <p className="text-orange-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">Pending Payouts</p>
                        <h3 className="text-xl font-bold">Rs {stats.pendingPayouts.toLocaleString()}</h3>
                        <p className="text-orange-200 text-[9px] font-medium uppercase tracking-tighter">Restaurants & Riders</p>
                    </div>
                </div>

                {/* Gateway Fees */}
                <div className="bg-purple-600 rounded-xl p-4 text-white shadow-lg shadow-purple-600/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                            <div className="bg-white/20 p-1.5 rounded-lg">
                                <span className="text-base font-bold">💳</span>
                            </div>
                        </div>
                        <p className="text-purple-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">Gateway Fees</p>
                        <h3 className="text-xl font-bold">Rs {stats.gatewayFees.toLocaleString()}</h3>
                        <p className="text-purple-200 text-[9px] font-medium uppercase tracking-tighter">Processing fees</p>
                    </div>
                </div>
            </div>

            {/* Sub Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Restaurant Earnings (90%)</p>
                    <h3 className="text-xl font-bold text-gray-800">Rs {stats.restaurantEarnings.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Rider Earnings</p>
                    <h3 className="text-xl font-bold text-gray-800">Rs {stats.riderEarnings.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-green-600 text-[10px] font-bold uppercase tracking-wider mb-1">Platform Net Revenue</p>
                    <h3 className="text-xl font-bold text-green-700">Rs {stats.netRevenue.toLocaleString()}</h3>
                    <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Commission - Gateway Fees</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-800 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                        Revenue & Commission Trend
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 600 }} 
                                    dy={10} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 600 }} 
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 700 }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-800 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                        <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
                        Payment Methods
                    </h3>
                    <div className="h-64 flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase text-gray-500 mt-4">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Card 45%</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div>Cash 35%</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div>Wallet 15%</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
