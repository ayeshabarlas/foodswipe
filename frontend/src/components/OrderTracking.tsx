'use client';

import React, { useEffect, useState } from 'react';
import { FaMotorcycle, FaPhone, FaCheck, FaCommentDots, FaTimes, FaMapMarkerAlt, FaChevronRight, FaBox, FaClock, FaRoute } from 'react-icons/fa';
import { initSocket, getSocket, subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
import dynamic from 'next/dynamic';
const OrderChat = dynamic(() => import('./OrderChat'), { ssr: false });
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
const RiderRatingModal = dynamic(() => import('./RiderRatingModal'), { ssr: false });

// Dynamically import MapComponent to avoid SSR and module instantiation issues
const MapComponent = dynamic(() => import('./MapComponent'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100">Loading map...</div>
});

interface OrderTrackingProps {
    order?: any;
    userRole?: 'user' | 'restaurant' | 'rider';
    isOpen?: boolean;
    onClose?: () => void;
    currentOrderId?: string;
    orderId?: string;
    isInline?: boolean;
}

export default function OrderTracking({ order: initialOrder, userRole = 'user', isOpen = true, onClose, orderId, currentOrderId, isInline = false }: OrderTrackingProps) {
    const targetOrderId = orderId || currentOrderId;
    const [order, setOrder] = useState<any>(initialOrder);
    const [loading, setLoading] = useState(!initialOrder && !!targetOrderId);
    const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(order?.riderLocation || null);
    const [eta, setEta] = useState<string>('25-35 mins');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [hasRated, setHasRated] = useState(order?.riderRating > 0);

    useEffect(() => {
        if (order?.riderRating > 0) {
            setHasRated(true);
        }
    }, [order?.riderRating]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('userInfo');
            if (saved) setUserInfo(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        if (!initialOrder && targetOrderId && isOpen) {
            const fetchOrder = async () => {
                try {
                    setLoading(true);
                    const userStr = typeof window !== 'undefined' ? localStorage.getItem('userInfo') : null;
                    if (!userStr) return;
                    const token = JSON.parse(userStr).token;
                    const { data } = await axios.get(`${getApiUrl()}/api/orders/${targetOrderId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setOrder(data);
                    
                    // Show rating modal if already delivered but not rated
                    if (data.status === 'Delivered' && !data.riderRating && userRole === 'user') {
                        setShowRatingModal(true);
                    }
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
        if (!order || !isOpen || !userInfo) return;

        const pusher = initSocket(userInfo._id, userRole,
            userRole === 'restaurant' ? userInfo.restaurantId : undefined
        );

        const channelName = userRole === 'restaurant' ? `restaurant-${userInfo.restaurantId}` : `user-${userInfo._id}`;
        const userChannel = subscribeToChannel(channelName);
        
        if (userChannel) {
            userChannel.bind('riderLocationUpdate', (data: any) => {
                if (data.orderId === order._id) {
                    setRiderLocation(data.location);
                }
            });

            userChannel.bind('orderStatusUpdate', (updatedOrder: any) => {
                console.log('Order status update received:', updatedOrder.status);
                if (updatedOrder._id === order?._id || updatedOrder._id === targetOrderId) {
                    setOrder(updatedOrder);
                    
                    // Show rating modal if delivered and not already rated
                    if (updatedOrder.status === 'Delivered' && !hasRated && userRole === 'user') {
                        console.log('Showing rating modal in 1.5s...');
                        setTimeout(() => {
                            setShowRatingModal(true);
                            // Also ensure the order object in state is updated
                            setOrder(prev => ({ ...prev, status: 'Delivered' }));
                        }, 1500);
                    }
                }
            });

            // Add listener for rider arrived
            userChannel.bind('riderArrived', (data: any) => {
                if (data.orderId === order._id) {
                    toast.success('📍 Your rider has arrived!');
                }
            });
        }

        return () => {
            unsubscribeFromChannel(channelName);
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
        { label: 'Order Confirmed', status: ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'OnTheWay', 'Arrived', 'Picked Up', 'ArrivedAtCustomer', 'Delivered'], icon: <FaCheck />, time: '2:30 PM' },
        { label: 'Preparing Food', status: ['Preparing', 'Ready', 'OnTheWay', 'Arrived', 'Picked Up', 'ArrivedAtCustomer', 'Delivered'], icon: <FaBox />, time: '2:45 PM' },
        { label: 'Rider Picked Up', status: ['Picked Up', 'ArrivedAtCustomer', 'Delivered'], icon: <FaMotorcycle />, time: '3:05 PM' },
        { label: 'Arrived at Customer', status: ['ArrivedAtCustomer', 'Delivered'], icon: <FaMapMarkerAlt />, time: '3:15 PM' },
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

    if (isInline) {
        return (
            <div className="h-full w-full relative bg-gray-200 z-0">
                <MapComponent
                    restaurantLoc={restaurantLoc}
                    customerLoc={customerLoc}
                    riderLoc={riderLoc}
                    order={order}
                />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center z-10">
                    <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-900 shadow-lg border border-gray-100">
                        Live tracking map
                    </span>
                </div>
            </div>
        );
    }

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
                    <div className="absolute top-10 right-6 flex gap-2">
                        {userRole === 'rider' && (
                            <button 
                                onClick={() => {
                                    const lat = order.status === 'Picked Up' ? order.deliveryLocation?.lat : order.restaurant?.location?.coordinates[1];
                                    const lng = order.status === 'Picked Up' ? order.deliveryLocation?.lng : order.restaurant?.location?.coordinates[0];
                                    if (lat && lng) {
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                                    } else {
                                        toast.error('Location data not available');
                                    }
                                }}
                                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                                title="Open in Google Maps"
                            >
                                <FaRoute />
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                        >
                            <FaTimes />
                        </button>
                    </div>
                    <h2 className="text-xl font-bold mb-1">Order Tracking</h2>
                    <p className="text-sm font-bold opacity-90">
                        Order #{order.orderNumber || order._id.slice(-6).toUpperCase()} • {order.restaurant?.name || 'Restaurant'}
                    </p>
                </div>

                {/* Map Area */}
                <div className="h-[300px] relative bg-gray-200 z-0">
                    <MapComponent
                        restaurantLoc={restaurantLoc}
                        customerLoc={customerLoc}
                        riderLoc={riderLoc}
                        order={order}
                    />
                    
                    {/* Live Tracking Map Overlay Text */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center z-10">
                        <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-900 shadow-lg border border-gray-100">
                            Live tracking map
                        </span>
                    </div>
                </div>

                {/* Quick Chat Actions - New Prominent Section */}
                <div className="bg-white px-6 py-4 border-b border-gray-100 shadow-sm z-20">
                    {order.rider ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                        <FaMotorcycle size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{order.rider.fullName || 'Rider'} is nearby</h4>
                                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Your delivery partner</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsChatOpen(true)}
                                        className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-all border border-orange-100"
                                    >
                                        <FaCommentDots size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsChatOpen(true)}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-red-600 transition-all"
                                >
                                    Chat with Rider
                                </button>
                                <button 
                                    onClick={() => setIsChatOpen(true)}
                                    className="flex-1 bg-white text-orange-500 border-2 border-orange-500 py-3 rounded-xl font-bold text-sm hover:bg-orange-50 transition-all"
                                >
                                    Chat with Shop
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-sm">Need to ask something?</h4>
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Chat with the restaurant</p>
                            </div>
                            <button 
                                onClick={() => setIsChatOpen(true)}
                                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all flex items-center gap-2"
                            >
                                <FaCommentDots size={16} />
                                Chat Now
                            </button>
                        </div>
                    )}
                </div>

                {/* Status Timeline - Screenshot Style */}
                <div className="bg-white p-8 overflow-y-auto flex-1 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-8">Order Status</h3>
                    <div className="relative">
                        {/* Vertical line connecting steps */}
                        <div className="absolute left-[15px] top-[15px] bottom-[15px] w-0.5 bg-gray-200" />
                        
                        <div className="space-y-10 relative">
                            {steps.map((step, index) => {
                                const isCompleted = index <= currentStepIndex;
                                const isCurrent = index === currentStepIndex + 1;
                                
                                return (
                                    <div key={index} className={`flex gap-6 items-start ${isCompleted ? 'opacity-100' : 'opacity-60'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 transition-all duration-500 ${
                                            isCompleted 
                                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200 scale-110' 
                                            : 'bg-white border-2 border-gray-200 text-gray-400'
                                        }`}>
                                            {isCompleted ? <FaCheck size={12} /> : step.icon}
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className={`font-bold text-sm ${isCompleted ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {step.label}
                                                </h4>
                                                <span className="text-[10px] font-bold text-gray-700">{step.time}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-wider">
                                                {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Chat Modal - Moved outside of the main motion.div to avoid stacking context issues */}
            {isChatOpen && (
                <div className="fixed inset-0 z-[99999]">
                    <OrderChat 
                        orderId={order._id}
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                        userRole={userRole === 'user' ? 'customer' : 'restaurant'}
                        userName={userInfo.name || 'User'}
                        userId={userInfo._id}
                        orderStatus={order.status}
                    />
                </div>
            )}

            <RiderRatingModal 
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                orderId={order._id}
                riderName={order.rider?.fullName || 'your rider'}
                onSuccess={() => setHasRated(true)}
            />
        </AnimatePresence>
    );
}

