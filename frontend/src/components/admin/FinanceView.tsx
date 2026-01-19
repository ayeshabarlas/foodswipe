'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getSocket } from '../../utils/socket';
import { API_BASE_URL } from '../../utils/config';
import { FaCalendarAlt, FaDownload } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function FinanceView() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        platformCommission: 0,
        netPlatformProfit: 0,
        totalDeliveryFees: 0,
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

        const socket = getSocket();
        const handleUpdate = () => {
            console.log('Finance-relevant update detected, refreshing stats...');
            fetchFinanceData();
        };

        if (socket) {
            socket.on('order_created', handleUpdate);
            socket.on('order_updated', handleUpdate);
            socket.on('stats_updated', handleUpdate);

            return () => {
                socket.off('order_created', handleUpdate);
                socket.off('order_updated', handleUpdate);
                socket.off('stats_updated', handleUpdate);
            };
        }
    }, []);

    const fetchFinanceData = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            // Fetch dashboard stats which is lighter and has aggregated data
            const res = await axios.get(`${API_BASE_URL}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            const data = res.data;

            // Use real data from backend
            const totalRevenue = data.totalRevenue || 0;
            const platformCommission = data.totalCommission || 0;
            const netPlatformProfit = data.netPlatformProfit || 0;
            const totalDeliveryFees = data.totalDeliveryFees || 0;
            const riderEarnings = data.totalRiderEarnings || 0;
            const restaurantEarnings = data.totalRestaurantEarnings || 0;
            const pendingPayouts = data.totalPendingPayouts || 0;
            
            setStats({
                totalRevenue,
                platformCommission,
                netPlatformProfit,
                totalDeliveryFees,
                pendingPayouts,
                gatewayFees: Math.round(totalRevenue * 0.02),
                restaurantEarnings,
                riderEarnings,
                netRevenue: netPlatformProfit, // Use the calculated net profit from backend
                thisMonthRevenue: data.todayRevenue ? data.todayRevenue * 30 : totalRevenue / 12
            });

            // Standardize chart data
            if (data.revenueStats && Array.isArray(data.revenueStats)) {
                const formattedChartData = data.revenueStats.map((item: any) => ({
                    name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                    revenue: item.revenue,
                    commission: item.commission || 0
                }));
                setChartData(formattedChartData as any);
            }

            setLoading(false);
        } catch (error: any) {
            console.error('Error fetching finance data:', error);
            if (error.response?.status !== 401) {
                toast.error('Failed to load financial data');
            }
            setLoading(false);
        }
    };

    const COLORS = ['#FF6A00', '#111827', '#6B7280', '#9CA3AF'];
    const pieData = [
        { name: 'Card', value: 45 },
        { name: 'Cash', value: 35 },
        { name: 'Wallet', value: 15 },
        { name: 'Other', value: 5 },
    ];

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Finance Overview</h2>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full border border-green-100">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[11px] font-bold text-green-600 uppercase tracking-tight">Live Updates</span>
                        </div>
                    </div>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Complete financial management with auto-split commission tracking</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 border border-gray-100 rounded-xl bg-white text-[#6B7280] text-[13px] font-bold uppercase tracking-wider hover:border-orange-500 hover:text-orange-500 transition-all shadow-sm active:scale-95">
                        <FaCalendarAlt /> Date Range
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-[13px] font-bold uppercase tracking-wider hover:from-orange-600 hover:to-pink-600 shadow-lg shadow-orange-500/20 transition-all active:scale-95">
                        <FaDownload /> Export
                    </button>
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-6 text-white shadow-xl shadow-gray-200 relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-lg font-bold">Rs.</span>
                            </div>
                            <span className="text-[11px] font-bold bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full uppercase tracking-wider border border-green-500/20 shadow-sm shadow-green-500/10">+12.5%</span>
                        </div>
                        <p className="text-white/60 text-[13px] font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                        <h3 className="text-[28px] font-bold tracking-tight">Rs. {stats.totalRevenue.toLocaleString()}</h3>
                        <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mt-1">Gross Sales Volume</p>
                    </div>
                </div>

                {/* Net Platform Profit */}
                <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-lg font-bold">↗</span>
                            </div>
                        </div>
                        <p className="text-white/60 text-[13px] font-bold uppercase tracking-wider mb-1">Net Platform Profit</p>
                        <h3 className="text-[28px] font-bold tracking-tight">Rs. {stats.netPlatformProfit.toLocaleString()}</h3>
                        <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mt-1">After Rider & Vendor Split</p>
                    </div>
                </div>

                {/* Pending Payouts */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-300 text-white">
                                <span className="text-lg font-bold">↘</span>
                            </div>
                        </div>
                        <p className="text-white/60 text-[13px] font-bold uppercase tracking-wider mb-1">Pending Payouts</p>
                        <h3 className="text-[28px] font-bold tracking-tight text-white">Rs. {stats.pendingPayouts.toLocaleString()}</h3>
                        <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mt-1">Vendors & Riders</p>
                    </div>
                </div>

                {/* Gateway Fees */}
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-[2rem] p-6 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-300 text-white">
                                <span className="text-lg font-bold">💳</span>
                            </div>
                        </div>
                        <p className="text-white/60 text-[13px] font-bold uppercase tracking-wider mb-1">Gateway Fees</p>
                        <h3 className="text-[28px] font-bold tracking-tight text-white">Rs. {stats.gatewayFees.toLocaleString()}</h3>
                        <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mt-1">Processing Cost</p>
                    </div>
                </div>
            </div>

            {/* Sub Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                    <p className="text-[#6B7280] text-[13px] font-medium uppercase tracking-wider mb-2">Restaurant Earnings</p>
                    <h3 className="text-[24px] font-bold text-[#111827] tracking-tight">Rs. {stats.restaurantEarnings.toLocaleString()}</h3>
                </div>
                <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                    <p className="text-[#6B7280] text-[13px] font-medium uppercase tracking-wider mb-2">Rider Earnings</p>
                    <h3 className="text-[24px] font-bold text-[#111827] tracking-tight">Rs. {stats.riderEarnings.toLocaleString()}</h3>
                </div>
                <div className="bg-green-50/50 p-6 rounded-[2rem] border border-green-100">
                    <p className="text-green-600 text-[13px] font-medium uppercase tracking-wider mb-2">Platform Net Revenue</p>
                    <h3 className="text-[24px] font-bold text-green-700 tracking-tight">Rs. {stats.netRevenue.toLocaleString()}</h3>
                    <p className="text-[11px] text-green-600/60 mt-1 uppercase font-medium tracking-wider">After Processor Fees</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-[#111827] text-[13px] font-medium uppercase tracking-wider mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full"></div>
                        Revenue & Commission Trend
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                                    dy={10} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                        padding: '12px 16px'
                                    }}
                                    itemStyle={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}
                                    labelStyle={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#FF6A00" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-[#111827] text-[13px] font-medium uppercase tracking-wider mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full"></div>
                        Payment Methods
                    </h3>
                    <div className="h-64 flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[11px] font-medium uppercase text-[#6B7280] mt-6">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#FF6A00]"></div>Card</div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#111827]"></div>Cash</div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#6B7280]"></div>Wallet</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
