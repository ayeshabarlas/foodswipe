'use client';

import React, { useEffect, useMemo } from 'react';
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

// Component to update map center and bounds
function MapUpdater({ restaurantLoc, customerLoc, riderLoc }: { restaurantLoc: [number, number], customerLoc: [number, number], riderLoc: [number, number] }) {
    const map = useMap();
    
    useEffect(() => {
        const bounds = L.latLngBounds([restaurantLoc, customerLoc, riderLoc]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }, [restaurantLoc, customerLoc, riderLoc, map]);

    return null;
}

interface MapComponentProps {
    restaurantLoc: [number, number];
    customerLoc: [number, number];
    riderLoc: [number, number];
    order: any;
}

export default function MapComponent({ restaurantLoc, customerLoc, riderLoc, order }: MapComponentProps) {
    // Default to Lahore center if any location is missing
    const safeRestaurantLoc = restaurantLoc || [31.5204, 74.3587];
    const safeCustomerLoc = customerLoc || [31.5204, 74.3587];
    const safeRiderLoc = riderLoc || safeRestaurantLoc;

    // Use CartoDB Voyager for a cleaner, more professional look
    const tileLayerUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    return (
        <MapContainer
            center={safeRiderLoc}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution={attribution}
                url={tileLayerUrl}
            />

            {/* Restaurant Marker */}
            <Marker position={safeRestaurantLoc} icon={iconStore}>
                <Popup>
                    <div className="font-semibold">{order.restaurant?.name || 'Restaurant'}</div>
                    <div className="text-xs">Pickup Location</div>
                </Popup>
            </Marker>

            {/* Customer Marker */}
            <Marker position={safeCustomerLoc} icon={iconPerson}>
                <Popup>
                    <div className="font-semibold">Your Location</div>
                    <div className="text-xs">Delivery Destination</div>
                </Popup>
            </Marker>

            {/* Rider Marker */}
            <Marker position={safeRiderLoc} icon={iconRider}>
                <Popup>
                    <div className="font-semibold">
                        {order.rider?.fullName || 'Rider'}
                    </div>
                    <div className="text-xs">
                        <FaPhone className="inline mr-1" />
                        {order.rider?.phoneNumber || 'No phone'}
                    </div>
                </Popup>
            </Marker>

            <MapUpdater 
                restaurantLoc={safeRestaurantLoc} 
                customerLoc={safeCustomerLoc} 
                riderLoc={safeRiderLoc} 
            />
        </MapContainer>
    );
}
