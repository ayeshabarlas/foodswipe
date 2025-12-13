'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FaPhone } from 'react-icons/fa';

// Fix Leaflet icon issues
const iconPerson = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const iconStore = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const iconRider = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to update map center when rider moves
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, map.getZoom());
    }, [center, map]);
    return null;
}

interface MapComponentProps {
    restaurantLoc: [number, number];
    customerLoc: [number, number];
    riderLoc: [number, number];
    order: any;
}

export default function MapComponent({ restaurantLoc, customerLoc, riderLoc, order }: MapComponentProps) {
    return (
        <MapContainer
            center={riderLoc}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Restaurant Marker */}
            <Marker position={restaurantLoc} icon={iconStore}>
                <Popup>
                    <div className="font-semibold">{order.restaurant?.name}</div>
                    <div className="text-xs">Pickup Location</div>
                </Popup>
            </Marker>

            {/* Customer Marker */}
            <Marker position={customerLoc} icon={iconPerson}>
                <Popup>
                    <div className="font-semibold">Customer</div>
                    <div className="text-xs">Delivery Location</div>
                </Popup>
            </Marker>

            {/* Rider Marker */}
            <Marker position={riderLoc} icon={iconRider}>
                <Popup>
                    <div className="font-semibold">
                        {order.rider?.fullName || 'Rider'}
                    </div>
                    <div className="text-xs">
                        <FaPhone className="inline mr-1" />
                        {order.rider?.phoneNumber}
                    </div>
                </Popup>
            </Marker>

            <MapUpdater center={riderLoc} />
        </MapContainer>
    );
}
