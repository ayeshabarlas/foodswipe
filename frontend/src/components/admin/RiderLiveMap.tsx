'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
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

        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('Connected to socket for live map');
        });

        socket.on('riderLocationUpdate', (data: any) => {
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
        });

        // Also listen for status changes if available
        socket.on('riderStatusUpdate', (data: any) => {
            setRiders(prev => prev.map(rider => {
                if (rider._id === data.riderId) {
                    return { ...rider, status: data.status };
                }
                return rider;
            }));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchRiders = async () => {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) return;
            const userInfo = JSON.parse(userInfoStr);

            const res = await axios.get(`${API_BASE_URL}/api/admin/riders`, {
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
            setLoading(false);
        } catch (error) {
            console.error('Error fetching riders:', error);
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
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-2xl border border-white/20 z-[400] w-72">
                    <h3 className="font-bold text-[#111827] text-[14px] mb-4 flex items-center gap-3 uppercase tracking-wider">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF6A00]">
                            <FaMotorcycle className="text-lg" />
                        </div>
                        Rider Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                            <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider">Online Now</span>
                            <span className="text-[18px] font-bold text-emerald-600">{onlineCount}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                            <span className="text-[12px] font-bold text-blue-700 uppercase tracking-wider">Busy / Enroute</span>
                            <span className="text-[18px] font-bold text-blue-600">{riders.filter(r => r.status === 'busy').length}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-widest">Last update</span>
                            <span className="text-[11px] font-mono font-bold text-[#6B7280]">{lastUpdate.toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
