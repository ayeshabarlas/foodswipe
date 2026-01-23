'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { getApiUrl } from '../../utils/config';
import { FaMotorcycle, FaSyncAlt } from 'react-icons/fa';

// Dynamically import the map content to avoid SSR issues
const LiveMapContent = dynamic(() => import('./LiveMapContent'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-50/50 rounded-[2rem]">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[#FF6A00]/20 border-t-[#FF6A00] rounded-full animate-spin mb-4"></div>
                <p className="text-[#6B7280] font-bold text-[13px] uppercase tracking-wider">Initializing Live Map...</p>
            </div>
        </div>
    ),
});

interface Rider {
    _id: string;
    user: { name: string; phone: string };
    totalDeliveries: number;
    phone: string;
    location?: {
        coordinates: [number, number];
    };
    status: 'online' | 'offline' | 'busy';
    currentOrder?: any;
    rating?: number;
}

export default function RiderLiveMap() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        fetchRiders();

        const socket = getSocket();

        if (socket) {
            const handleLocationUpdate = (data: any) => {
                console.log('Rider location update:', data);
                setRiders(prev => prev.map(rider => {
                    if (rider._id === data.riderId) {
                        return {
                            ...rider,
                            location: data.location,
                            status: 'online' // Assume online if sending updates
                        };
                    }
                    return rider;
                }));
                setLastUpdate(new Date());
            };

            const handleStatusUpdate = (data: any) => {
                setRiders(prev => prev.map(rider => {
                    if (rider._id === data.riderId) {
                        return { ...rider, status: data.status };
                    }
                    return rider;
                }));
            };

            socket.on('riderLocationUpdate', handleLocationUpdate);
            socket.on('riderStatusUpdate', handleStatusUpdate);

            return () => {
                socket.off('riderLocationUpdate', handleLocationUpdate);
                socket.off('riderStatusUpdate', handleStatusUpdate);
            };
        }
    }, []);

    const fetchRiders = async () => {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) return;
            const userInfo = JSON.parse(userInfoStr);

            const res = await axios.get(`${getApiUrl()}/api/admin/riders`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            // Map the response to our Rider interface if needed
            // Assuming the API returns riders with user populated
            const mappedRiders = res.data.map((r: any) => ({
                _id: r._id,
                user: r.user,
                phone: r.user?.phone,
                totalDeliveries: r.totalOrders || 0,
                location: r.location, // Ensure backend returns this
                status: r.isOnline ? 'online' : 'offline',
                rating: r.stats?.rating,
                currentOrder: r.currentOrder
            }));

            setRiders(mappedRiders);
        } catch (error: any) {
            console.error('Error fetching riders for live map:', error);
            // Silence but log
        } finally {
            setLoading(false);
        }
    };

    const onlineCount = riders.filter(r => r.status !== 'offline').length;

    return (
        <div className="h-[calc(100vh-6rem)] p-8 flex flex-col gap-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-[24px] font-bold text-[#111827] tracking-tight mb-1">Live Rider Map</h2>
                    <p className="text-[#6B7280] text-[14px]">Real-time tracking of {onlineCount} active riders on the field</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-[12px] font-bold text-[#111827] uppercase tracking-wider">Live Updates Active</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative">
                <LiveMapContent riders={riders} />

                {/* Overlay Stats */}
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-white/20 z-[400] w-80">
                    <h3 className="font-bold text-[#111827] text-[13px] mb-6 flex items-center gap-4 uppercase tracking-[0.15em]">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                            <FaMotorcycle className="text-xl" />
                        </div>
                        Rider Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 group hover:bg-emerald-50 transition-all cursor-default">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Online Now</span>
                                <span className="text-[20px] font-bold text-emerald-600">{onlineCount} Riders</span>
                            </div>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 group hover:bg-blue-50 transition-all cursor-default">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1">Busy / Enroute</span>
                                <span className="text-[20px] font-bold text-blue-600">{riders.filter(r => r.status === 'busy').length} Riders</span>
                            </div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-[0.15em] mb-1">Last update</span>
                                <span className="text-[12px] font-bold text-[#6B7280]">{lastUpdate.toLocaleTimeString()}</span>
                            </div>
                            <button 
                                onClick={fetchRiders}
                                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#6B7280] hover:bg-orange-50 hover:text-orange-500 transition-all active:scale-90 border border-gray-100"
                            >
                                <FaSyncAlt className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

