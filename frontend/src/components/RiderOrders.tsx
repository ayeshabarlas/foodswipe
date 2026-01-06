'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaBox, FaCheckCircle, FaClock, FaTimes, FaMapMarkerAlt, FaPhone, FaCommentDots } from 'react-icons/fa';
import { initSocket, disconnectSocket, getSocket } from '../utils/socket';
import toast, { Toaster } from 'react-hot-toast';
import { useGeolocation } from '../utils/useGeolocation';
import dynamic from 'next/dynamic';
import OrderChat from './OrderChat';

// Dynamically import map to avoid SSR issues
const OrderTracking = dynamic(() => import('./OrderTracking'), { ssr: false });

interface RiderOrdersProps {
    riderId: string;
}

export default function RiderOrders({ riderId }: RiderOrdersProps) {
    const [orders, setOrders] = useState<any[]>([]);
    const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
    const [activeDelivery, setActiveDelivery] = useState<any>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

    // Track location if there's an active delivery
    const { location } = useGeolocation(!!activeDelivery);

    // Update location to backend
    useEffect(() => {
        if (location && activeDelivery) {
            const updateLocation = async () => {
                try {
                    const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                    await axios.put(
                        `${API_BASE_URL}/api/riders/${riderId}/location`,
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

    const [completionData, setCompletionData] = useState<any>(null);
    const [riderWallet, setRiderWallet] = useState(0);

    const fetchOrders = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setOrders(res.data);
                // Check for active delivery (picked up but not delivered)
                const active = res.data.find((o: any) => o.status === 'Picked Up' || (o.status === 'OnTheWay' && o.rider === riderId));
                setActiveDelivery(active);
            }

            // Also fetch wallet balance
            const riderRes = await axios.get(`${API_BASE_URL}/api/riders/${riderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (riderRes.data && riderRes.data.walletBalance !== undefined) {
                setRiderWallet(riderRes.data.walletBalance);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
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
                `${API_BASE_URL}/api/riders/${riderId}/accept-order`,
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
                `${API_BASE_URL}/api/riders/${riderId}/orders/${orderId}/pickup`,
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

    const handleDeliverOrder = async (orderId: string) => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            // For now, we'll pass a random distance between 2 and 8 km for demo/testing
            const distanceKm = (Math.random() * 6 + 2).toFixed(1);
            const dist = parseFloat(distanceKm);
            
            // Calculate earnings for the UI (using same logic as backend)
            const BASE_PAY = 100;
            const PER_KM_RATE = 20;
            const PLATFORM_FEE = 15;
            const gross = BASE_PAY + (dist * PER_KM_RATE);
            const net = gross - PLATFORM_FEE;

            // Updated to use the new /complete endpoint
            await axios.post(
                `${API_BASE_URL}/api/orders/${orderId}/complete`,
                { distanceKm: dist },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Set data for the summary modal
            setCompletionData({
                distanceKm: dist,
                grossEarning: gross,
                platformFee: PLATFORM_FEE,
                netEarning: net,
                orderId: orderId
            });

            toast.success('🎉 Order delivered successfully!');
            fetchOrders();
        } catch (error) {
            console.error('Error delivering order:', error);
            toast.error('Failed to mark as delivered');
        }
    };

    const [activeChat, setActiveChat] = useState<any>(null);

    const handleChat = (order: any) => {
        setActiveChat(order);
        setIsChatOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 p-4 lg:p-6 text-[13px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-gray-900">Delivery Orders</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setFilter('active')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'active' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-white text-gray-600 border border-gray-100'}`}
                    >
                        Active
                    </button>
                    <button 
                        onClick={() => setFilter('completed')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'completed' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-white text-gray-600 border border-gray-100'}`}
                    >
                        History
                    </button>
                </div>
            </div>

            {/* Active Delivery Map */}
            {activeDelivery && (
                <div className="mb-6">
                    <h2 className="font-bold text-lg mb-2">Current Delivery</h2>
                    <OrderTracking order={activeDelivery} userRole="user" />
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {filteredOrders.map(order => (
                    <OrderCard 
                        key={order._id} 
                        order={order} 
                        riderId={riderId} 
                        onAccept={handleAcceptOrder} 
                        onPickup={handlePickupOrder}
                        onDeliver={handleDeliverOrder}
                        onChat={handleChat}
                    />
                ))}
                {filteredOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <FaBox size={40} className="mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No orders found</p>
                    </div>
                )}
            </div>

            <OrderChat 
                orderId={activeChat?._id || ''}
                isOpen={isChatOpen}
                onClose={() => {
                    setIsChatOpen(false);
                    setActiveChat(null);
                }}
                userRole="rider"
                userName={userInfo.name || 'Rider'}
            />

            {/* Order Completion Summary Modal */}
            {completionData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-600 p-8 text-center text-white">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaCheckCircle size={32} />
                            </div>
                            <h3 className="text-2xl font-bold">Order Completed! 🎉</h3>
                            <p className="opacity-90 text-sm mt-1">Excellent job on this delivery</p>
                        </div>
                        
                        <div className="p-8">
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between items-center text-gray-600">
                                    <span className="font-medium">Distance</span>
                                    <span className="font-bold text-gray-900">{completionData.distanceKm} km</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600">
                                    <span className="font-medium">Gross Earning</span>
                                    <span className="font-bold text-gray-900">Rs. {completionData.grossEarning}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600">
                                    <span className="font-medium">Platform Fee</span>
                                    <span className="font-bold text-red-500">-Rs. {completionData.platformFee}</span>
                                </div>
                                <div className="pt-4 border-t border-dashed border-gray-200 flex justify-between items-center">
                                    <span className="font-bold text-gray-900 text-lg">You Earned</span>
                                    <span className="font-black text-green-600 text-2xl">Rs. {completionData.netEarning}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 mb-8 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <FaCheckCircle size={20} />
                                    </div>
                                    <span className="text-gray-600 font-medium">Wallet Balance</span>
                                </div>
                                <span className="font-bold text-gray-900">Rs. {riderWallet.toLocaleString()}</span>
                            </div>

                            <button
                                onClick={() => setCompletionData(null)}
                                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition shadow-lg shadow-gray-200"
                            >
                                Close Summary
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toaster />
        </div>
    );
}

function OrderCard({ order, riderId, onAccept, onPickup, onDeliver, onChat }: { order: any; riderId: string; onAccept: (id: string) => void; onPickup: (id: string) => void; onDeliver: (id: string) => void; onChat: (order: any) => void }) {
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
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 mb-1 font-normal">Deliver to</p>
                                <p className="font-semibold text-gray-900">{order.customer?.name || 'Customer'}</p>
                            </div>
                            {isAssignedToMe && (
                                <button
                                    onClick={() => onChat(order)}
                                    className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition"
                                >
                                    <FaCommentDots />
                                </button>
                            )}
                        </div>
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
                    <p className="font-semibold text-gray-900">{order.distanceKm || (Math.random() * 5 + 1).toFixed(1)} km</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1 font-normal">Earnings</p>
                    <p className="font-semibold text-green-600">Rs. {order.netRiderEarning || (order.status === 'Delivered' ? '185' : '---')}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1 font-normal">Items</p>
                    <p className="font-semibold text-gray-900">{order.items?.length || order.orderItems?.length || '---'}</p>
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
                <button
                    onClick={() => onDeliver(order._id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                    <FaCheckCircle /> Mark as Delivered
                </button>
            )}

            {isAssignedToOther && (
                <div className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold text-center">
                    Assigned to Another Rider
                </div>
            )}
        </div>
    );
}
