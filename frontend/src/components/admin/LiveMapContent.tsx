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
                            <div className="min-w-[240px] p-2">
                                <h3 className="text-[16px] font-bold text-[#111827] tracking-tight mb-2">{rider.user.name}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                        rider.status === 'online' ? 'bg-emerald-50 text-emerald-600' :
                                        rider.status === 'busy' ? 'bg-orange-50 text-[#FF6A00]' : 
                                        'bg-gray-50 text-[#9CA3AF]'
                                    }`}>
                                        {rider.status}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                        <FaStar className="text-[10px]" /> {rider.rating || 4.5}
                                    </span>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-3 text-[#6B7280]">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                            <FaMotorcycle className="text-sm" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Deliveries</p>
                                            <p className="text-[13px] font-bold text-[#111827]">{rider.totalDeliveries} Completed</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[#6B7280]">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                                            <FaPhone className="text-sm" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Contact</p>
                                            <p className="text-[13px] font-bold text-[#111827]">{rider.phone}</p>
                                        </div>
                                    </div>
                                </div>
                                {rider.currentOrder && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                                            <p className="text-[10px] font-bold text-[#FF6A00] mb-1 uppercase tracking-widest">Active Delivery</p>
                                            <p className="text-[13px] font-bold text-[#111827]">Order #{rider.currentOrder.orderNumber}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            <MapUpdater center={center} />
        </MapContainer>
    );
}
