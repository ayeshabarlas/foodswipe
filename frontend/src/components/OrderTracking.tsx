'use client';

import React, { useEffect, useState } from 'react';
import { FaMotorcycle, FaPhone } from 'react-icons/fa';
import { initSocket } from '../utils/socket';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Dynamically import MapComponent to avoid SSR and module instantiation issues
const MapComponent = dynamic(() => import('./MapComponent'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100">Loading map...</div>
});

interface OrderTrackingProps {
    order?: any;
    userRole?: 'user' | 'restaurant';
    isOpen?: boolean;
    onClose?: () => void;
    currentOrderId?: string;
    orderId?: string;
}

export default function OrderTracking({ order: initialOrder, userRole = 'user', isOpen, onClose, orderId, currentOrderId }: OrderTrackingProps) {
    // Handle both orderId prop names for compatibility
    const targetOrderId = orderId || currentOrderId;

    // Initialize order state
    const [order, setOrder] = useState<any>(initialOrder);
    const [loading, setLoading] = useState(!initialOrder && !!targetOrderId);

    // Fetch order if only ID is provided
    useEffect(() => {
        if (!initialOrder && targetOrderId) {
            const fetchOrder = async () => {
                try {
                    const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
                    const { data } = await axios.get(`http://localhost:5000/api/orders/${targetOrderId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setOrder(data);
                } catch (error) {
                    console.error('Error fetching order for tracking:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchOrder();
        } else if (initialOrder) {
            setOrder(initialOrder);
        }
    }, [targetOrderId, initialOrder]);

    const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(
        order?.riderLocation || null
    );
    const [eta, setEta] = useState<string>('Calculating...');

    useEffect(() => {
        if (!order) return;

        // Initialize socket
        const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
        const socket = initSocket(userInfo._id, userRole,
            userRole === 'restaurant' ? userInfo.restaurantId : undefined
        );

        // Calculate ETA immediately on mount with initial location
        if (riderLocation) {
            calculateETA(riderLocation);
        } else {
            // If no rider location yet, estimate from restaurant  
            setEta('25-35 mins');
        }

        socket?.on('riderLocationUpdate', (data: any) => {
            if (data.orderId === order._id) {
                console.log('Rider location updated:', data.location);
                setRiderLocation(data.location);
                calculateETA(data.location);
            }
        });

        // Cleanup handled by socket utility's logic or global disconnect
    }, [order?._id, userRole]);

    const calculateETA = (currentLoc: { lat: number; lng: number }) => {
        if (!order?.deliveryAddress) {
            setEta('25-35 mins');
            return;
        }

        // Mock customer location (Lahore center for demo if not geocoded)
        const customerLat = 31.5204;
        const customerLng = 74.3587;

        const dist = Math.sqrt(
            Math.pow(currentLoc.lat - customerLat, 2) +
            Math.pow(currentLoc.lng - customerLng, 2)
        );

        // Rough estimate: 1 degree approx 111km
        const km = dist * 111;
        const mins = Math.round((km / 30) * 60); // Assuming 30km/h avg speed

        setEta(mins > 0 ? `${mins} mins` : '15-20 mins');
    };

    if (loading) return <div className="p-8 text-center">Loading tracking details...</div>;

    // Return early if no order
    if (!order) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No order data available
            </div>
        );
    }

    // Default locations if not present (Lahore)
    const restaurantLoc: [number, number] = order.restaurant?.location
        ? [order.restaurant.location.coordinates[1], order.restaurant.location.coordinates[0]]
        : [31.4805, 74.2809]; // Johar Town

    const customerLoc: [number, number] = [31.5204, 74.3587]; // Default customer

    const riderLoc: [number, number] = riderLocation
        ? [riderLocation.lat, riderLocation.lng]
        : restaurantLoc; // Start at restaurant

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FaMotorcycle className="text-orange-500" />
                        Tracking Order #{order.orderNumber || order._id.slice(-6)}
                    </h3>
                    <p className="text-sm text-gray-500 font-normal">
                        {order.rider ? `${order.rider.fullName} is on the way` : 'Waiting for rider...'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 font-normal">Estimated Arrival</p>
                    <p className="font-semibold text-green-600 text-lg">{eta}</p>
                </div>
            </div>

            <div className="h-[400px] w-full relative bg-gray-100 z-0">
                <MapComponent
                    restaurantLoc={restaurantLoc}
                    customerLoc={customerLoc}
                    riderLoc={riderLoc}
                    order={order}
                />
            </div>

            {order.rider && (
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <FaMotorcycle className="text-gray-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{order.rider.fullName}</p>
                            <p className="text-xs text-gray-500 font-normal">{order.rider.vehicleType || 'Motorcycle'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (order.rider?.phoneNumber) {
                                navigator.clipboard.writeText(order.rider.phoneNumber);
                                alert('📞 Rider phone number copied!');
                            }
                        }}
                        className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 hover:bg-green-200 transition cursor-pointer"
                    >
                        <FaPhone />
                    </button>
                </div>
            )}
        </div>
    );
}
