'use client';

import React, { useEffect, useState } from 'react';
import { FaMotorcycle, FaPhone, FaCheck, FaCommentDots } from 'react-icons/fa';
import { initSocket, getSocket } from '../utils/socket';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import dynamic from 'next/dynamic';
import OrderChat from './OrderChat';

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
                    const { data } = await axios.get(`${API_BASE_URL}/api/orders/${targetOrderId}`, {
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
    const [isChatOpen, setIsChatOpen] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

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

        socket?.on('orderStatusUpdate', (updatedOrder: any) => {
            if (updatedOrder._id === order._id) {
                console.log('Order status updated via socket:', updatedOrder.status);
                setOrder(updatedOrder);
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

    const steps = [
        { label: 'Assigned', status: ['Accepted', 'Preparing', 'Ready', 'OnTheWay', 'Picked Up', 'Delivered'] },
        { label: 'On Way', status: ['OnTheWay', 'Picked Up', 'Delivered'] },
        { label: 'Arrived', status: ['Picked Up', 'Delivered'] },
        { label: 'Picked Up', status: ['Picked Up', 'Delivered'] }
    ];

    const currentStepIndex = steps.findLastIndex(step => step.status.includes(order.status));

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {/* Header with Progress Bar */}
            <div className="p-6 bg-white border-b border-gray-100">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-black text-gray-900 text-xl flex items-center gap-2">
                            <FaMotorcycle className="text-orange-500" />
                            Tracking Order
                        </h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                            Order #{order.orderNumber || order._id.slice(-6)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Estimated Arrival</p>
                        <p className="font-black text-green-600 text-2xl">{eta}</p>
                    </div>
                </div>

                {/* Progress Bar UI */}
                <div className="relative pt-2 pb-6">
                    <div className="flex justify-between mb-2">
                        {steps.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center flex-1 relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${idx <= currentStepIndex
                                    ? 'bg-orange-500 border-orange-100 text-white'
                                    : 'bg-white border-gray-100 text-gray-300'
                                    }`}>
                                    {idx < currentStepIndex ? <FaCheck size={12} /> : <span className="text-xs font-black">{idx + 1}</span>}
                                </div>
                                <span className={`text-[10px] font-black uppercase mt-2 tracking-tighter ${idx <= currentStepIndex ? 'text-orange-500' : 'text-gray-300'
                                    }`}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    {/* Background Line */}
                    <div className="absolute top-[22px] left-0 w-full h-1 bg-gray-100 rounded-full z-0"></div>
                    {/* Active Progress Line */}
                    <div
                        className="absolute top-[22px] left-0 h-1 bg-orange-500 rounded-full z-0 transition-all duration-1000"
                        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                    ></div>
                </div>
            </div>

            <div className="h-[350px] w-full relative bg-gray-100 z-0">
                <MapComponent
                    restaurantLoc={restaurantLoc}
                    customerLoc={customerLoc}
                    riderLoc={riderLoc}
                    order={order}
                />

                {/* Rider Info Card */}
                {order.rider && (
                    <div className="absolute bottom-6 left-6 right-6 bg-white rounded-2xl shadow-2xl p-4 flex items-center justify-between z-10 border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-black text-lg">
                                {order.rider.fullName?.charAt(0) || 'R'}
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Your Rider</p>
                                <h4 className="font-black text-gray-900">{order.rider.fullName || 'Rider Assigned'}</h4>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsChatOpen(true)}
                                className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors"
                            >
                                <FaCommentDots />
                            </button>
                            <a 
                                href={`tel:${order.rider.phoneNumber || ''}`}
                                className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                            >
                                <FaPhone />
                            </a>
                        </div>
                    </div>
                )}
            </div>

            <OrderChat 
                orderId={order._id}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                userRole={userRole === 'user' ? 'customer' : 'restaurant'}
                userName={userInfo.name || 'User'}
            />
        </div>
    );
}
