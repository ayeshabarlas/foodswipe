'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FaMotorcycle, FaPhone, FaStar } from 'react-icons/fa';

// Fix Leaflet icon issues
const iconRider = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const iconStore = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface Rider {
    _id: string;
    user: { name: string };
    totalDeliveries: number;
    phone: string;
    location?: {
        coordinates: [number, number]; // [lng, lat]
    };
    status: 'online' | 'offline' | 'busy';
    currentOrder?: any;
    rating?: number;
}

interface LiveMapContentProps {
    riders: Rider[];
    center?: [number, number];
}

// Component to update map center
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, map.getZoom());
    }, [center, map]);
    return null;
}

export default function LiveMapContent({ riders, center = [31.5204, 74.3587] }: LiveMapContentProps) {
    const onlineRiders = riders.filter(r => r.location && r.status !== 'offline');

    return (
        <MapContainer
            center={center}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {onlineRiders.map((rider) => {
                if (!rider.location?.coordinates) return null;
                // MongoDB stores as [lng, lat], Leaflet needs [lat, lng]
                const position: [number, number] = [
                    rider.location.coordinates[1] || 31.5204,
                    rider.location.coordinates[0] || 74.3587
                ];

                return (
                    <Marker key={rider._id} position={position} icon={iconRider}>
                        <Popup>
                            <div className="min-w-[280px] p-4 font-sans">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                        <FaMotorcycle className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold text-[#111827] tracking-tight leading-none mb-1">{rider.user.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                                rider.status === 'online' ? 'bg-emerald-50 text-emerald-600' :
                                                rider.status === 'busy' ? 'bg-orange-50 text-[#FF6A00]' : 
                                                'bg-gray-50 text-[#9CA3AF]'
                                            }`}>
                                                {rider.status}
                                            </span>
                                            <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                                <FaStar size={8} /> {rider.rating?.toFixed(1) || '0.0'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Deliveries</p>
                                        <p className="text-[14px] font-bold text-[#111827]">{rider.totalDeliveries}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Contact</p>
                                        <p className="text-[14px] font-bold text-[#111827] truncate">{rider.phone}</p>
                                    </div>
                                </div>

                                {rider.currentOrder && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="bg-gradient-to-r from-orange-500/5 to-pink-500/5 p-4 rounded-2xl border border-orange-100/50 relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <p className="text-[9px] font-bold text-[#FF6A00] mb-1 uppercase tracking-[0.15em]">Active Delivery</p>
                                                <p className="text-[14px] font-bold text-[#111827]">Order #{rider.currentOrder.orderNumber}</p>
                                            </div>
                                            <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:scale-110 transition-transform">
                                                <FaMotorcycle size={40} className="text-orange-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="mt-4 flex gap-2">
                                    <a 
                                        href={`tel:${rider.phone}`}
                                        className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[11px] font-bold rounded-xl text-center shadow-md hover:shadow-lg transition-all active:scale-95 uppercase tracking-widest no-underline"
                                    >
                                        Call Rider
                                    </a>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            <MapUpdater center={center} />
        </MapContainer>
    );
}
