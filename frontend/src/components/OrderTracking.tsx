'use client';

import React, { useEffect, useState } from 'react';
import { FaMotorcycle, FaPhone, FaCheck, FaCommentDots, FaTimes, FaMapMarkerAlt, FaChevronRight, FaBox, FaClock } from 'react-icons/fa';
import { initSocket, getSocket } from '../utils/socket';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import dynamic from 'next/dynamic';
import OrderChat from './OrderChat';
import { motion, AnimatePresence } from 'framer-motion';

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
    const targetOrderId = orderId || currentOrderId;
    const [order, setOrder] = useState<any>(initialOrder);
    const [loading, setLoading] = useState(!initialOrder && !!targetOrderId);
    const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(order?.riderLocation || null);
    const [eta, setEta] = useState<string>('25-35 mins');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

    useEffect(() => {
        if (!initialOrder && targetOrderId && isOpen) {
            const fetchOrder = async () => {
                try {
                    setLoading(true);
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
    }, [targetOrderId, initialOrder, isOpen]);

    useEffect(() => {
        if (!order || !isOpen) return;

        const socket = initSocket(userInfo._id, userRole,
            userRole === 'restaurant' ? userInfo.restaurantId : undefined
        );

        if (socket && order._id) {
            socket.emit('joinOrderChat', { orderId: order._id });
        }

        socket?.on('riderLocationUpdate', (data: any) => {
            if (data.orderId === order._id) {
                setRiderLocation(data.location);
            }
        });

        socket?.on('orderStatusUpdate', (updatedOrder: any) => {
            if (updatedOrder._id === order._id) {
                setOrder(updatedOrder);
            }
        });

        return () => {
            // Socket utility handles cleanup
        };
    }, [order?._id, userRole, isOpen]);

    if (!isOpen) return null;

    if (loading) return (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-gray-900">Loading Tracking Details...</p>
            </div>
        </div>
    );

    if (!order) return null;

    const steps = [
        { label: 'Order Confirmed', status: ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'OnTheWay', 'Delivered'], icon: <FaCheck />, time: '2:30 PM' },
        { label: 'Preparing Food', status: ['Preparing', 'Ready', 'OnTheWay', 'Delivered'], icon: <FaBox />, time: '2:45 PM' },
        { label: 'Rider Picked Up', status: ['Ready', 'OnTheWay', 'Delivered'], icon: <FaMotorcycle />, time: '3:05 PM' },
        { label: 'Order Delivered', status: ['Delivered'], icon: <FaCheck />, time: '3:20 PM' }
    ];

    const currentStepIndex = steps.findLastIndex(step => 
        step.status.some(s => s.toLowerCase() === (order.status || '').toLowerCase().replace(/\s/g, ''))
    );

    const restaurantLoc: [number, number] = order.restaurant?.location
        ? [order.restaurant.location.coordinates[1], order.restaurant.location.coordinates[0]]
        : [31.4805, 74.2809];

    const customerLoc: [number, number] = order.deliveryLocation
        ? [order.deliveryLocation.lat, order.deliveryLocation.lng]
        : [31.5204, 74.3587];

    const riderLoc: [number, number] = riderLocation
        ? [riderLocation.lat, riderLocation.lng]
        : restaurantLoc;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-hidden"
            >
                {/* Header - Screenshot Style */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 pt-12 text-white relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-10 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                    >
                        <FaTimes />
                    </button>
                    <h2 className="text-xl font-black mb-1">Order Tracking</h2>
                    <p className="text-sm font-bold opacity-90">
                        Order #{order.orderNumber || order._id.slice(-6).toUpperCase()} • {order.restaurant?.name || 'Restaurant'}
                    </p>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative bg-gray-200">
                    <MapComponent
                        restaurantLoc={restaurantLoc}
                        customerLoc={customerLoc}
                        riderLoc={riderLoc}
                        order={order}
                    />
                    
                    {/* Live Tracking Map Overlay Text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-2">
                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                <FaMotorcycle size={24} />
                            </div>
                        </div>
                        <span className="bg-white/90 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-sm">
                            Live tracking map
                        </span>
                    </div>

                    {/* Rider Nearby Card - Screenshot Style */}
                    {order.rider && (
                        <div className="absolute bottom-6 left-6 right-6 bg-[#FFF8F4] border border-orange-100 rounded-[32px] p-6 shadow-2xl z-10">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                    <FaMotorcycle size={20} />
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 text-lg">Your rider is nearby</h4>
                                    <p className="text-sm font-medium text-gray-500">
                                        <span className="text-gray-900 font-bold">{order.rider.fullName || 'Rider'}</span> is delivering your order
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <a 
                                    href={`tel:${order.rider.phoneNumber || ''}`}
                                    className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-center shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all"
                                >
                                    Call Rider
                                </a>
                                <button 
                                    onClick={() => setIsChatOpen(true)}
                                    className="flex-1 bg-white text-orange-500 border-2 border-orange-500 py-4 rounded-2xl font-black hover:bg-orange-50 transition-all"
                                >
                                    Message
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Timeline - Screenshot Style */}
                <div className="bg-white p-8 overflow-y-auto max-h-[300px] border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-8">Order Status</h3>
                    <div className="space-y-0">
                        {steps.map((step, idx) => {
                            const isCompleted = idx <= currentStepIndex;
                            const isLast = idx === steps.length - 1;
                            
                            return (
                                <div key={idx} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                                            isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {step.icon}
                                        </div>
                                        {!isLast && (
                                            <div className={`w-0.5 h-16 transition-all duration-1000 ${
                                                isCompleted ? 'bg-green-500' : 'bg-gray-100'
                                            }`} />
                                        )}
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <div className="flex justify-between items-center">
                                            <h4 className={`font-black text-lg transition-colors ${
                                                isCompleted ? 'text-gray-900' : 'text-gray-300'
                                            }`}>
                                                {step.label}
                                            </h4>
                                            <span className="text-xs font-bold text-gray-400">
                                                {step.time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Chat Modal */}
                <OrderChat 
                    orderId={order._id}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    userRole={userRole === 'user' ? 'customer' : 'restaurant'}
                    userName={userInfo.name || 'User'}
                />
            </motion.div>
        </AnimatePresence>
    );
}
