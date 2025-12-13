'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBox, FaCheckCircle, FaClock, FaTimes, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import { initSocket, disconnectSocket } from '../utils/socket';
import toast, { Toaster } from 'react-hot-toast';
import { useGeolocation } from '../utils/useGeolocation';
import dynamic from 'next/dynamic';

// Dynamically import map to avoid SSR issues
const OrderTracking = dynamic(() => import('./OrderTracking'), { ssr: false });

interface RiderOrdersProps {
    riderId: string;
}

export default function RiderOrders({ riderId }: RiderOrdersProps) {
    const [orders, setOrders] = useState<any[]>([]);
    const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
    const [activeDelivery, setActiveDelivery] = useState<any>(null);

    // Track location if there's an active delivery
    const { location } = useGeolocation(!!activeDelivery);

    // Update location to backend
    useEffect(() => {
        if (location && activeDelivery) {
            const updateLocation = async () => {
                try {
                    const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                    await axios.put(
                        `http://localhost:5000/api/riders/${riderId}/location`,
                        {
                            lat: location.lat,
                            lng: location.lng,
                            orderId: activeDelivery._id
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } catch (error) {
                    console.error('Error updating location:', error);
                }
            };
            updateLocation();
        }
    }, [location, activeDelivery, riderId]);

    const fetchOrders = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            const res = await axios.get(`http://localhost:5000/api/riders/${riderId}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setOrders(res.data);
                // Check for active delivery (picked up but not delivered)
                const active = res.data.find((o: any) => o.status === 'Picked Up' || (o.status === 'OnTheWay' && o.rider === riderId));
                setActiveDelivery(active);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    useEffect(() => {
        fetchOrders();

        const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
        const socket = initSocket(userInfo._id, 'rider', undefined, riderId);

        socket?.on('newOrderAvailable', (orderData: any) => {
            console.log('New order available for riders:', orderData);

            // Play notification sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (err) {
                console.log('Audio notification failed:', err);
            }

            toast.success('🆕 New order available!', {
                duration: 5000,
                position: 'top-center',
            });
            fetchOrders();
        });

        socket?.on('orderStatusUpdate', () => {
            fetchOrders();
        });

        return () => {
            disconnectSocket();
        };
    }, [riderId]);

    const filteredOrders = orders.filter(order => {
        if (filter === 'active') return ['Ready', 'OnTheWay', 'Confirmed', 'Picked Up'].includes(order.status);
        if (filter === 'completed') return order.status === 'Delivered';
        return true;
    });

    const handleAcceptOrder = async (orderId: string) => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.post(
                `http://localhost:5000/api/riders/${riderId}/accept-order`,
                { orderId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('✅ Order accepted!');
            fetchOrders();
        } catch (error) {
            console.error('Error accepting order:', error);
            toast.error('Failed to accept order');
        }
    };

    const handlePickupOrder = async (orderId: string) => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(
                `http://localhost:5000/api/riders/${riderId}/orders/${orderId}/pickup`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('📦 Order picked up! Tracking started.');
            fetchOrders();
        } catch (error) {
            console.error('Error picking up order:', error);
            toast.error('Failed to mark as picked up');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Orders</h1>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <button onClick={() => setFilter('active')} className={`flex-1 py-2 rounded-lg font-semibold transition ${filter === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Active</button>
                    <button onClick={() => setFilter('completed')} className={`flex-1 py-2 rounded-lg font-semibold transition ${filter === 'completed' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Completed</button>
                    <button onClick={() => setFilter('all')} className={`flex-1 py-2 rounded-lg font-semibold transition ${filter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
                </div>
            </div>

            {/* Active Delivery Map */}
            {activeDelivery && (
                <div className="px-6 pt-6">
                    <div className="mb-4">
                        <h2 className="font-bold text-lg mb-2">Current Delivery</h2>
                        <OrderTracking order={activeDelivery} userRole="user" />
                    </div>
                </div>
            )}

            {/* Orders List */}
            <div className="px-6 py-6">
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center">
                        <FaBox className="text-5xl text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No {filter} orders yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order, idx) => (
                            <OrderCard
                                key={idx}
                                order={order}
                                riderId={riderId}
                                onAccept={handleAcceptOrder}
                                onPickup={handlePickupOrder}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Toaster />
        </div>
    );
}

function OrderCard({ order, riderId, onAccept, onPickup }: { order: any; riderId: string; onAccept: (id: string) => void; onPickup: (id: string) => void }) {
    const getStatusIcon = () => {
        switch (order.status) {
            case 'Delivered': return <FaCheckCircle className="text-green-500" />;
            case 'Ready': case 'OnTheWay': case 'Confirmed': case 'Preparing': case 'Picked Up': return <FaClock className="text-orange-500" />;
            default: return <FaTimes className="text-red-500" />;
        }
    };

    const getStatusColor = () => {
        switch (order.status) {
            case 'Delivered': return 'bg-green-100 text-green-700';
            case 'Ready': case 'OnTheWay': case 'Confirmed': case 'Preparing': case 'Picked Up': return 'bg-orange-100 text-orange-700';
            default: return 'bg-red-100 text-red-700';
        }
    };

    const isAssignedToMe = order.rider === riderId;
    const canAccept = ['Ready', 'OnTheWay'].includes(order.status) && !order.rider;
    const canPickup = isAssignedToMe && ['Ready', 'OnTheWay'].includes(order.status);
    const isPickedUp = order.status === 'Picked Up';
    const isAssignedToOther = order.rider && order.rider !== riderId;

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            {/* Order Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="text-xl">{getStatusIcon()}</div>
                    <div>
                        <p className="font-semibold text-gray-900">Order #{order.orderNumber}</p>
                        <p className="text-xs text-gray-500 font-normal">{order.timeAgo || 'Just now'}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor()}`}>
                    {order.status}
                </span>
            </div>

            {/* Restaurant & Delivery Address Sections */}
            <div className="mb-3 pb-3 border-b border-gray-100">
                <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="text-orange-500 mt-1 flex-shrink-0" />
                    <div>
                        <p className="text-xs text-gray-500 mb-1 font-normal">Pickup from</p>
                        <p className="font-semibold text-gray-900">{order.restaurant?.name || 'Restaurant'}</p>
                        <p className="text-sm text-gray-600">{order.restaurant?.address || 'Restaurant Address'}</p>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="text-blue-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1 font-normal">Deliver to</p>
                        <p className="font-semibold text-gray-900">{order.customer?.name || 'Customer'}</p>
                        <p className="text-sm text-gray-600 font-normal">{order.deliveryAddress || 'Delivery Address'}</p>
                        {order.customer?.phone && (
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(order.customer.phone);
                                    toast.success('📞 Phone number copied!');
                                }}
                                className="inline-flex items-center gap-1 mt-1 text-sm text-green-600 hover:text-green-700 font-medium cursor-pointer"
                            >
                                <FaPhone className="text-xs" />
                                {order.customer.phone}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1 font-normal">Distance</p>
                    <p className="font-semibold text-gray-900">3.2 km</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1 font-normal">Earnings</p>
                    <p className="font-semibold text-green-600">PKR 180</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1 font-normal">Time</p>
                    <p className="font-semibold text-gray-900">15 min</p>
                </div>
            </div>

            {/* Actions */}
            {canAccept && (
                <button
                    onClick={() => onAccept(order._id)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition"
                >
                    Accept Order
                </button>
            )}

            {canPickup && (
                <button
                    onClick={() => onPickup(order._id)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                    <FaBox /> Mark as Picked Up
                </button>
            )}

            {isPickedUp && (
                <div className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-semibold text-center border border-blue-100">
                    Delivery in Progress
                </div>
            )}

            {isAssignedToOther && (
                <div className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold text-center">
                    Assigned to Another Rider
                </div>
            )}
        </div>
    );
}
