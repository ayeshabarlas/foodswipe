'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaBox, FaCheckCircle, FaClock, FaTimes, FaMapMarkerAlt, FaPhone, FaCommentDots, FaBell, FaDollarSign, FaMotorcycle, FaRoute } from 'react-icons/fa';
import { initSocket, disconnectSocket, getSocket, subscribeToChannel } from '../utils/socket';
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
    const [availableFilter, setAvailableFilter] = useState<'all' | 'nearby' | 'high_pay'>('all');
    const [activeDelivery, setActiveDelivery] = useState<any>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeChat, setActiveChat] = useState<any>(null);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

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
                // Check for active delivery (any status that isn't Delivered or Cancelled)
                const active = res.data.find((o: any) => 
                    ['Confirmed', 'OnTheWay', 'Arrived', 'Picked Up', 'ArrivedAtCustomer'].includes(o.status)
                );
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
        initSocket(userInfo._id, 'rider', undefined, riderId);

        // Subscribe to channels and bind events
        const ridersChannel = subscribeToChannel('riders');
        const personalChannel = subscribeToChannel(`rider-${riderId}`);

        if (ridersChannel) {
            ridersChannel.bind('newOrderAvailable', (orderData: any) => {
                console.log('New order available for riders:', orderData);

                // Play notification sound
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
        }

        if (personalChannel) {
            personalChannel.bind('orderStatusUpdate', () => {
                fetchOrders();
            });
        }

        return () => {
            disconnectSocket();
        };
    }, [riderId]);

    // Calculate potential earnings from available orders
    const potentialEarnings = orders
        .filter(o => !o.rider && ['Ready', 'OnTheWay'].includes(o.status))
        .reduce((sum, o) => sum + (o.netRiderEarning || 0), 0);

    const availableOrdersCount = orders.filter(o => !o.rider && ['Ready', 'OnTheWay'].includes(o.status)).length;
    const nearbyOrdersCount = orders.filter(o => !o.rider && ['Ready', 'OnTheWay'].includes(o.status) && (o.distanceKm || 0) < 5).length;
    const highPayOrdersCount = orders.filter(o => !o.rider && ['Ready', 'OnTheWay'].includes(o.status) && (o.netRiderEarning || 0) > 300).length;

    const filteredOrders = orders.filter(order => {
        if (filter === 'active') {
            // If viewing active orders, show both "Available" orders to accept AND orders already assigned to me
            // but prioritize assigned orders by showing them in the tracking card
            if (activeDelivery && order._id === activeDelivery._id) return false;
            
            const isAvailable = !order.rider && ['Ready', 'OnTheWay'].includes(order.status);
            const isAssignedToMe = order.rider === riderId || (order.rider?._id === riderId);
            
            if (!isAvailable && !isAssignedToMe) return false;

            // Apply available filters if it's an available order
            if (isAvailable) {
                if (availableFilter === 'nearby' && (order.distanceKm || 0) >= 5) return false;
                if (availableFilter === 'high_pay' && (order.netRiderEarning || 0) <= 300) return false;
            }

            return true;
        }
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
            toast.success('✅ Order accepted! Let\'s go.');
            fetchOrders();
        } catch (error) {
            console.error('Error accepting order:', error);
            toast.error('Failed to accept order');
        }
    };

    const handleUpdateStatus = async (orderId: string, status: string, message: string) => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(
                `${API_BASE_URL}/api/orders/${orderId}/status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(message);
            fetchOrders();
        } catch (error) {
            console.error(`Error updating status to ${status}:`, error);
            toast.error('Update failed. Please try again.');
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
            toast.success('📦 Order picked up! On your way to customer.');
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

            // Updated to use the correct API_BASE_URL
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

    const handleChat = (order: any) => {
        setActiveChat(order);
        setIsChatOpen(true);
    };

    const handleViewDetails = (order: any) => {
        setSelectedOrder(order);
        setShowDetailsModal(true);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-[13px] overflow-hidden relative">
            <Toaster />
            
            {/* 1. Header Section - Gradient with Notification Bell */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 shadow-lg z-20 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white tracking-tight">Available Orders</h1>
                    <div className="relative">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white cursor-pointer hover:bg-white/30 transition-all">
                            <FaBell size={20} />
                        </div>
                        {availableOrdersCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 border-2 border-white text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                {availableOrdersCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto pb-20">
                {/* 2. Earnings Section */}
                <div className="px-6 py-6">
                    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 font-bold text-[11px] uppercase tracking-wider mb-1">Potential Earnings</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-green-600">PKR {potentialEarnings}</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                            <FaDollarSign size={24} />
                        </div>
                    </div>
                </div>

                {/* 3. Tabs Section & 4. Horizontal Scroll */}
                <div className="px-6 mb-4">
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                        <button 
                            onClick={() => { setFilter('active'); setAvailableFilter('all'); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'active' && availableFilter === 'all' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-gray-400 border border-gray-100'}`}
                        >
                            All Orders
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === 'active' && availableFilter === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
                                {availableOrdersCount}
                            </span>
                        </button>
                        <button 
                            onClick={() => { setFilter('active'); setAvailableFilter('nearby'); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'active' && availableFilter === 'nearby' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-gray-400 border border-gray-100'}`}
                        >
                            Nearby
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === 'active' && availableFilter === 'nearby' ? 'bg-white/20' : 'bg-gray-100'}`}>
                                {nearbyOrdersCount}
                            </span>
                        </button>
                        <button 
                            onClick={() => { setFilter('active'); setAvailableFilter('high_pay'); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'active' && availableFilter === 'high_pay' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-gray-400 border border-gray-100'}`}
                        >
                            High Pay
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === 'active' && availableFilter === 'high_pay' ? 'bg-white/20' : 'bg-gray-100'}`}>
                                {highPayOrdersCount}
                            </span>
                        </button>
                        <button 
                            onClick={() => setFilter('completed')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'completed' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-gray-400 border border-gray-100'}`}
                        >
                            History
                        </button>
                    </div>
                    {/* Horizontal Scroll Indicator Line */}
                    <div className="h-0.5 bg-gray-100 w-full mt-1 relative overflow-hidden rounded-full">
                        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-orange-500 to-red-500 opacity-30 rounded-full" />
                    </div>
                </div>

                <div className="px-6 space-y-6">
                    {/* Active Delivery Tracking Card - Screenshot Style */}
                    {activeDelivery && (
                        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6">
                            {/* Status Header */}
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <FaBox />
                                    <span className="font-bold uppercase tracking-wider text-[10px]">
                                        {activeDelivery.status === 'Confirmed' ? 'Order Accepted' : 
                                         activeDelivery.status === 'OnTheWay' ? 'Heading to Restaurant' :
                                         activeDelivery.status === 'Arrived' ? 'At Restaurant' :
                                         activeDelivery.status === 'Picked Up' ? 'Heading to Customer' :
                                         activeDelivery.status === 'ArrivedAtCustomer' ? 'At Customer Location' : 'Order Tracking'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold">#{activeDelivery.orderNumber || activeDelivery._id.slice(-7).toUpperCase()}</span>
                            </div>

                            <div className="p-0">
                                {activeDelivery.status === 'Confirmed' ? (
                                    /* Screenshot 2: Order Accepted Screen */
                                    <div className="flex flex-col bg-gray-50">
                                        {/* Map Area at the top */}
                                        <div className="h-[250px] w-full relative">
                                            <OrderTracking order={activeDelivery} userRole="rider" />
                                            <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                                                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-800">Live Location</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Details Card */}
                                        <div className="px-4 -mt-10 pb-8 relative z-10">
                                            <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
                                                <div className="flex items-center justify-center mb-6">
                                                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                                                        <FaCheckCircle size={32} />
                                                    </div>
                                                </div>
                                                
                                                <h2 className="text-2xl font-bold text-center text-[#FF4D00] mb-1">Order Accepted!</h2>
                                                <p className="text-gray-400 text-center text-xs font-bold mb-8">You've successfully accepted this delivery</p>

                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                                                        <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Order Summary</span>
                                                        <span className="text-gray-900 font-bold text-sm">Order ID <span className="text-gray-400 ml-1">#{activeDelivery.orderNumber || activeDelivery._id.slice(-6).toUpperCase()}</span></span>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex gap-4">
                                                            <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 flex-shrink-0">
                                                                <FaMapMarkerAlt size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pickup from</p>
                                                            <p className="font-bold text-gray-900 text-sm">{activeDelivery.restaurant?.name}</p>
                                                            <p className="text-[11px] font-bold text-gray-500 mt-0.5">{activeDelivery.distanceKm || '1.2'} km away</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 flex-shrink-0">
                                                            <FaMapMarkerAlt size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deliver to</p>
                                                            <p className="font-bold text-gray-900 text-sm line-clamp-1">{activeDelivery.user?.address || 'Customer Location'}</p>
                                                            <p className="text-[11px] font-bold text-gray-500 mt-0.5">{(activeDelivery.distanceKm * 1.5).toFixed(1) || '3.5'} km from restaurant</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-50 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs">
                                                            <span>$</span> You'll earn
                                                        </div>
                                                        <span className="text-[#FF4D00] font-bold text-lg">PKR {activeDelivery.netRiderEarning || 180}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs">
                                                            <FaClock /> Estimated time
                                                        </div>
                                                        <span className="text-gray-900 font-bold text-sm">{activeDelivery.estimatedTime || '25-30'} mins</span>
                                                    </div>
                                                </div>
                                                </div>

                                                <button 
                                                    onClick={() => handleUpdateStatus(activeDelivery._id, 'OnTheWay', '🚀 Delivery started!')}
                                                    className="w-full mt-8 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                    <FaMapMarkerAlt size={14} />
                                                    START DELIVERY
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Screenshot 4 & 5: Tracking View with Map and Status Buttons */
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h2 className="text-lg font-bold tracking-tight text-gray-900">
                                                    {activeDelivery.status === 'OnTheWay' || activeDelivery.status === 'Arrived' ? 'Pickup' : 'Delivery'} In Progress
                                                </h2>
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                                                    {activeDelivery.status === 'OnTheWay' || activeDelivery.status === 'Arrived' ? 'Restaurant' : 'Customer'}: {activeDelivery.status === 'OnTheWay' || activeDelivery.status === 'Arrived' ? activeDelivery.restaurant?.name : activeDelivery.user?.name}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-orange-500">25-35 <span className="text-xs font-bold">MINS</span></p>
                                            </div>
                                        </div>

                                        {/* Progress Steps */}
                                        <div className="relative flex justify-between items-center mb-10 px-2">
                                            <div className="absolute left-6 right-6 h-1 bg-gray-100 top-[14px] z-0" />
                                            <div 
                                                className="absolute left-6 h-1 bg-gradient-to-r from-orange-500 to-red-500 top-[14px] z-0 transition-all duration-1000" 
                                                style={{ 
                                                    width: activeDelivery.status === 'Delivered' ? '100%' : 
                                                           activeDelivery.status === 'Picked Up' || activeDelivery.status === 'ArrivedAtCustomer' ? '66.6%' : 
                                                           activeDelivery.status === 'Arrived' ? '33.3%' : '0%' 
                                                }}
                                            />
                                            
                                            {[
                                                { label: 'ACCEPTED', status: 'Confirmed' },
                                                { label: 'AT STORE', status: 'Arrived' },
                                                { label: 'PICKED UP', status: 'Picked Up' },
                                                { label: 'DELIVERED', status: 'Delivered' }
                                            ].map((step, idx) => {
                                                const statuses = ['Confirmed', 'OnTheWay', 'Arrived', 'Picked Up', 'ArrivedAtCustomer', 'Delivered'];
                                                const currentIdx = statuses.indexOf(activeDelivery.status);
                                                const stepIdx = statuses.indexOf(step.status);
                                                const isCompleted = currentIdx >= stepIdx;
                                                
                                                return (
                                                    <div key={step.label} className="relative z-10 flex flex-col items-center">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-500 ${isCompleted ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                            {isCompleted ? <FaCheckCircle size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                                        </div>
                                                        <span className={`absolute -bottom-6 whitespace-nowrap text-[8px] font-bold tracking-tight ${isCompleted ? 'text-orange-500' : 'text-gray-300'}`}>
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Map Area */}
                                        <div className="rounded-2xl overflow-hidden h-64 border border-gray-100 shadow-inner mt-4 mb-6">
                                            <OrderTracking order={activeDelivery} userRole="rider" />
                                        </div>

                                        {/* Action Buttons based on status */}
                                        <div className="space-y-3">
                                            {activeDelivery.status === 'OnTheWay' && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(activeDelivery._id, 'Arrived', '📍 Arrived at restaurant!')}
                                                    className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
                                                >
                                                    ARRIVED AT RESTAURANT
                                                </button>
                                            )}
                                            {activeDelivery.status === 'Arrived' && (
                                                <button 
                                                    onClick={() => handlePickupOrder(activeDelivery._id)}
                                                    className="w-full bg-[#FF4D00] hover:bg-[#FF3300] text-white py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
                                                >
                                                    ORDER PICKED UP
                                                </button>
                                            )}
                                            {activeDelivery.status === 'Picked Up' && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(activeDelivery._id, 'ArrivedAtCustomer', '📍 Arrived at customer location!')}
                                                    className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
                                                >
                                                    ARRIVED AT CUSTOMER
                                                </button>
                                            )}
                                            {activeDelivery.status === 'ArrivedAtCustomer' && (
                                                <button 
                                                    onClick={() => handleDeliverOrder(activeDelivery._id)}
                                                    className="w-full bg-[#00D97E] hover:bg-[#00BD6E] text-white py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
                                                >
                                                    MARK AS DELIVERED
                                                </button>
                                            )}
                                            
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => handleChat(activeDelivery)}
                                                    className="flex-1 bg-white border border-gray-100 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50 transition-all"
                                                >
                                                    <FaCommentDots className="text-orange-500" /> CHAT
                                                </button>
                                                <a 
                                                    href={`tel:${activeDelivery.status === 'OnTheWay' || activeDelivery.status === 'Arrived' ? activeDelivery.restaurant?.contact : activeDelivery.user?.phone}`}
                                                    className="flex-1 bg-white border border-gray-100 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50 transition-all"
                                                >
                                                    <FaPhone className="text-green-500" /> CALL
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <FaBox size={24} />
                            </div>
                            <p className="font-bold">No orders found</p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
                            <OrderCard 
                                key={order._id}
                                order={order}
                                riderId={riderId}
                                onAccept={handleAcceptOrder}
                                onPickup={handlePickupOrder}
                                onDeliver={handleDeliverOrder}
                                onChat={handleChat}
                                onViewDetails={handleViewDetails}
                            />
                        ))
                    )}
                </div>
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
                userId={userInfo._id}
                orderStatus={activeChat?.status}
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
                                    <span className="font-bold text-green-600 text-2xl">Rs. {completionData.netEarning}</span>
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

            {/* Order Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4">
                    <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">#{selectedOrder.orderNumber}</p>
                            </div>
                            <button 
                                onClick={() => setShowDetailsModal(false)}
                                className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8">
                            {/* Items List */}
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Items Summary</h4>
                                <div className="space-y-4">
                                    {(selectedOrder.items || selectedOrder.orderItems || []).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center font-bold text-orange-500 shadow-sm border border-orange-50">
                                                    {item.quantity}x
                                                </div>
                                                <span className="font-bold text-gray-900">{item.name || (item.dish && item.dish.name)}</span>
                                            </div>
                                            <span className="font-bold text-gray-900">Rs. {item.price || (item.dish && item.dish.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Customer & Address */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50">
                                    <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">Customer</h4>
                                    <p className="font-bold text-gray-900 text-lg mb-1">{selectedOrder.customer?.name || 'Guest User'}</p>
                                    <p className="text-xs font-bold text-orange-600/70">{selectedOrder.customer?.phone || 'No phone provided'}</p>
                                </div>
                                <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50">
                                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Payment</h4>
                                    <p className="font-bold text-gray-900 text-lg mb-1">{selectedOrder.paymentMethod || 'COD'}</p>
                                    <p className="text-xs font-bold text-blue-600/70">Total: Rs. {selectedOrder.totalAmount || selectedOrder.totalPrice}</p>
                                </div>
                            </div>

                            {/* Delivery Address */}
                            <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Delivery Address</h4>
                                <p className="font-bold text-gray-900 leading-relaxed">{selectedOrder.deliveryAddress || 'No address provided'}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition shadow-lg shadow-gray-200"
                            >
                                CLOSE DETAILS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toaster />
        </div>
    );
}

function OrderCard({ 
    order, 
    riderId, 
    onAccept, 
    onPickup, 
    onDeliver, 
    onChat,
    onViewDetails 
}: { 
    order: any; 
    riderId: string; 
    onAccept: (id: string) => void; 
    onPickup: (id: string) => void; 
    onDeliver: (id: string) => void; 
    onChat: (order: any) => void;
    onViewDetails: (order: any) => void;
}) {
    const isAssignedToMe = order.rider === riderId || (order.rider?._id === riderId);
    const isAvailable = !order.rider && ['Ready', 'OnTheWay'].includes(order.status);
    
    // Real-time time ago and urgency calculation
    const [timeAgo, setTimeAgo] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const updateTime = () => {
            if (!order.createdAt) {
                setTimeAgo('Recently');
                return;
            }
            const created = new Date(order.createdAt).getTime();
            if (isNaN(created)) {
                setTimeAgo('Recently');
                return;
            }
            const now = new Date().getTime();
            const diffInMins = Math.floor((now - created) / 60000);
            
            if (isNaN(diffInMins)) {
                setTimeAgo('Recently');
                return;
            }
            
            if (diffInMins < 0) {
                setTimeAgo('Just now');
            } else if (diffInMins < 1) {
                setTimeAgo('Just now');
            } else if (diffInMins < 60) {
                setTimeAgo(`${diffInMins} mins ago`);
            } else {
                const hours = Math.floor(diffInMins / 60);
                const mins = diffInMins % 60;
                setTimeAgo(`${hours}h ${mins}m ago`);
            }
            
            // Mark as urgent if older than 5 minutes and still available
            setIsUrgent(isAvailable && diffInMins >= 5);
        };

        updateTime();
        const interval = setInterval(updateTime, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, [order.createdAt, isAvailable]);

    return (
        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1.5">
                        {/* 5. Urgency Badge */}
                        {isUrgent && (
                            <div className="flex items-center gap-1.5 bg-red-50 text-red-600 text-[10px] font-bold uppercase px-2 py-1 rounded-lg w-fit animate-pulse">
                                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                                Urgent
                            </div>
                        )}
                        {/* Restaurant Name & Earnings */}
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">{order.restaurant?.name || 'Restaurant'}</h3>
                            <span className="text-green-600 font-bold text-sm">+PKR {order.netRiderEarning || 250}</span>
                        </div>
                        {/* Order Age */}
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {timeAgo}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {isAssignedToMe && (
                            <button
                                onClick={() => onChat(order)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-100 transition-all border border-orange-100/50"
                            >
                                <FaCommentDots size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Chat</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Pickup & Delivery Locations */}
                <div className="space-y-4 mb-6 relative">
                    {/* Connector line */}
                    <div className="absolute left-[11px] top-[14px] bottom-[14px] w-0.5 border-l-2 border-dotted border-gray-100" />
                    
                    <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-500 flex-shrink-0 z-10">
                            <FaMapMarkerAlt size={12} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Pickup</p>
                            <p className="text-[12px] font-bold text-gray-900 line-clamp-1">{order.restaurant?.address || 'Restaurant Address'}</p>
                        </div>
                    </div>

                    <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0 z-10">
                            <FaMapMarkerAlt size={12} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Delivery</p>
                            <p className="text-[12px] font-bold text-gray-900 line-clamp-1">{order.deliveryAddress || 'Delivery Address'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    {/* Distance & ETA */}
                    <div className="flex items-center gap-3 text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <FaRoute size={12} />
                            <span className="text-[11px] font-bold">{order.distanceKm || '3.2'} km</span>
                        </div>
                        <div className="h-1 w-1 bg-gray-200 rounded-full" />
                        <div className="flex items-center gap-1.5">
                            <FaClock size={12} />
                            <span className="text-[11px] font-bold">{order.estimatedTime || '15'} min</span>
                        </div>
                    </div>
                    
                    {/* Action Button */}
                    <button 
                        onClick={() => onViewDetails(order)}
                        className="text-orange-500 font-bold text-xs uppercase tracking-wider hover:underline"
                    >
                        View Details
                    </button>
                </div>
                
                {/* Real-time Accept Button for available orders */}
                {isAvailable && (
                    <button 
                            onClick={() => handleAcceptOrder(order._id)}
                            className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                        >
                            Accept Order
                        </button>
                )}
            </div>
        </div>
    );
}
