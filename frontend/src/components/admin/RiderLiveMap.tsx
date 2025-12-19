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
        <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-2xl">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Loading Map...</p>
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
        <div className="h-[calc(100vh-6rem)] p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Live Rider Map</h2>
                    <p className="text-gray-500">Real-time tracking of {onlineCount} active riders</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium text-gray-700">Live Updates Active</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
                <LiveMapContent riders={riders} />

                {/* Overlay Stats */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100 z-[400] w-64">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <FaMotorcycle className="text-orange-500" /> Rider Status
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Online</span>
                            <span className="font-bold text-green-600">{onlineCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Busy / Enroute</span>
                            <span className="font-bold text-blue-600">{riders.filter(r => r.status === 'busy').length}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-xs text-gray-400">Last update</span>
                            <span className="text-xs font-mono text-gray-500">{lastUpdate.toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
