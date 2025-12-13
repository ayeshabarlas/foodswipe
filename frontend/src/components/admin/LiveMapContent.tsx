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
                            <div className="min-w-[200px]">
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{rider.user.name}</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rider.status === 'online' ? 'bg-green-100 text-green-700' :
                                            rider.status === 'busy' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {rider.status.toUpperCase()}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-full">
                                        <FaStar /> {rider.rating || 4.5}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FaMotorcycle />
                                        <span>{rider.totalDeliveries} Deliveries</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaPhone />
                                        <span>{rider.phone}</span>
                                    </div>
                                </div>
                                {rider.currentOrder && (
                                    <div className="mt-3 pt-2 border-t border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 mb-1">CURRENT ORDER</p>
                                        <p className="text-sm font-semibold">Order #{rider.currentOrder.orderNumber}</p>
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
