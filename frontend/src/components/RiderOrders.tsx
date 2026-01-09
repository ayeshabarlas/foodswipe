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
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

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
        if (filter === 'active') {
            // Don't show the order in the list if it's already in the tracking card at the top
            if (activeDelivery && order._id === activeDelivery._id) return false;
            return ['Ready', 'OnTheWay', 'Confirmed', 'Picked Up', 'Arrived'].includes(order.status);
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

    const [activeChat, setActiveChat] = useState<any>(null);

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
            {/* Header - Fixed at top */}
            <div className="bg-white p-4 lg:p-6 shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center justify-between">
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
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 pb-20">
                {/* Active Delivery Tracking Card - Screenshot Style */}
                {activeDelivery && (
                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-800">Live Location</span>
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
                                            
                                            <h2 className="text-2xl font-black text-center text-[#FF4D00] mb-1">Order Accepted!</h2>
                                            <p className="text-gray-400 text-center text-xs font-bold mb-8">You've successfully accepted this delivery</p>

                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                                                    <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Order Summary</span>
                                                    <span className="text-gray-900 font-black text-sm">Order ID <span className="text-gray-400 ml-1">#{activeDelivery.orderNumber || activeDelivery._id.slice(-6).toUpperCase()}</span></span>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 flex-shrink-0">
                                                            <FaMapMarkerAlt size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup from</p>
                                                            <p className="font-black text-gray-900 text-sm">{activeDelivery.restaurant?.name}</p>
                                                            <p className="text-[11px] font-bold text-gray-500 mt-0.5">1.2 km away</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 flex-shrink-0">
                                                            <FaMapMarkerAlt size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deliver to</p>
                                                            <p className="font-black text-gray-900 text-sm line-clamp-1">{activeDelivery.user?.address || 'Customer Location'}</p>
                                                            <p className="text-[11px] font-bold text-gray-500 mt-0.5">3.5 km from restaurant</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-50 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs">
                                                            <span>$</span> You'll earn
                                                        </div>
                                                        <span className="text-[#FF4D00] font-black text-lg">PKR 180</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs">
                                                            <FaClock /> Estimated time
                                                        </div>
                                                        <span className="text-gray-900 font-black text-sm">25-30 mins</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleUpdateStatus(activeDelivery._id, 'OnTheWay', '🚀 Delivery started!')}
                                                className="w-full mt-8 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                            >
                                                <FaMapMarkerAlt size={14} />
                                                START DELIVERY
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Screenshot 4 & 5: Tracking View with Map and Status Buttons */
                                <>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-lg font-black tracking-tight text-gray-900">
                                                {activeDelivery.status === 'OnTheWay' || activeDelivery.status === 'Arrived' ? 'Pickup' : 'Delivery'} In Progress
                                            </h2>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                                                {activeDelivery.status === 'OnTheWay' || activeDelivery.status === 'Arrived' ? 'Restaurant' : 'Customer'}: {activeDelivery.status === 'OnTheWay' || activeDelivery.status === 'Arrived' ? activeDelivery.restaurant?.name : activeDelivery.user?.name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-orange-500">25-35 <span className="text-xs font-bold">MINS</span></p>
                                        </div>
                                    </div>

                                    {/* Progress Steps */}
                                    <div className="relative flex justify-between items-center mb-10 px-2">
                                        <div className="absolute left-6 right-6 h-1 bg-gray-100 top-[14px] z-0" />
                                        <div 
                                            className="absolute left-6 h-1 bg-orange-500 top-[14px] z-0 transition-all duration-1000" 
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
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-500 ${isCompleted ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
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
                                                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95"
                                            >
                                                ARRIVED AT RESTAURANT
                                            </button>
                                        )}
                                        {activeDelivery.status === 'Arrived' && (
                                            <button 
                                                onClick={() => handlePickupOrder(activeDelivery._id)}
                                                className="w-full bg-[#FF4D00] hover:bg-[#FF3300] text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95"
                                            >
                                                ORDER PICKED UP
                                            </button>
                                        )}
                                        {activeDelivery.status === 'Picked Up' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(activeDelivery._id, 'ArrivedAtCustomer', '📍 Arrived at customer location!')}
                                                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95"
                                            >
                                                ARRIVED AT CUSTOMER
                                            </button>
                                        )}
                                        {activeDelivery.status === 'ArrivedAtCustomer' && (
                                            <button 
                                                onClick={() => handleDeliverOrder(activeDelivery._id)}
                                                className="w-full bg-[#00D97E] hover:bg-[#00BD6E] text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95"
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
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Orders List */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">
                        {filter === 'active' ? 'Active Tasks' : 'Delivery History'}
                    </h3>
                    {filteredOrders.map(order => (
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
                    ))}
                    {filteredOrders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                            <FaBox size={32} className="mb-3 opacity-10" />
                            <p className="font-semibold uppercase tracking-widest text-[9px]">No orders found</p>
                        </div>
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

            {/* Order Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4">
                    <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Order Details</h3>
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
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Items Summary</h4>
                                <div className="space-y-4">
                                    {(selectedOrder.items || selectedOrder.orderItems || []).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center font-black text-orange-500 shadow-sm border border-orange-50">
                                                    {item.quantity}x
                                                </div>
                                                <span className="font-bold text-gray-900">{item.name || (item.dish && item.dish.name)}</span>
                                            </div>
                                            <span className="font-black text-gray-900">Rs. {item.price || (item.dish && item.dish.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Customer & Address */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50">
                                    <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">Customer</h4>
                                    <p className="font-black text-gray-900 text-lg mb-1">{selectedOrder.customer?.name || 'Guest User'}</p>
                                    <p className="text-xs font-bold text-orange-600/70">{selectedOrder.customer?.phone || 'No phone provided'}</p>
                                </div>
                                <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50">
                                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Payment</h4>
                                    <p className="font-black text-gray-900 text-lg mb-1">{selectedOrder.paymentMethod || 'COD'}</p>
                                    <p className="text-xs font-bold text-blue-600/70">Total: Rs. {selectedOrder.totalAmount || selectedOrder.totalPrice}</p>
                                </div>
                            </div>

                            {/* Delivery Address */}
                            <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery Address</h4>
                                <p className="font-bold text-gray-900 leading-relaxed">{selectedOrder.deliveryAddress || 'No address provided'}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black transition shadow-lg shadow-gray-200"
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
    // Rider Earning Logic implementation
    const calculateEarnings = () => {
        if (order.netRiderEarning) return order.netRiderEarning;
        
        const distance = order.distanceKm || 3.5; // fallback
        const BASE_PAY = 100;
        const PER_KM_RATE = 20;
        const PLATFORM_FEE = 15;
        
        const net = Math.round(BASE_PAY + (distance * PER_KM_RATE) - PLATFORM_FEE);
        return net;
    };

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
                        <p className="font-bold text-gray-900">Order #{order.orderNumber}</p>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{order.timeAgo || 'Just now'}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor()}`}>
                    {order.status}
                </span>
            </div>

            {/* Restaurant & Delivery Address Sections */}
            <div className="mb-3 pb-3 border-b border-gray-100">
                <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="text-orange-500 mt-1 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Pickup from</p>
                        <p className="font-bold text-gray-900">{order.restaurant?.name || 'Restaurant'}</p>
                        <p className="text-xs text-gray-500 font-medium">{order.restaurant?.address || 'Restaurant Address'}</p>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="text-blue-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Deliver to</p>
                                <p className="font-bold text-gray-900">{order.customer?.name || 'Customer'}</p>
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
                        <p className="text-xs text-gray-500 font-medium">{order.deliveryAddress || 'Delivery Address'}</p>
                        {order.customer?.phone && (
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(order.customer.phone);
                                    toast.success('📞 Phone number copied!');
                                }}
                                className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 hover:text-green-700 font-bold cursor-pointer"
                            >
                                <FaPhone className="text-[10px]" />
                                {order.customer.phone}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Distance</p>
                    <p className="font-bold text-gray-900">{order.distanceKm || '3.5'} km</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-[10px] text-green-600/70 mb-1 font-bold uppercase tracking-wider">Earnings</p>
                    <p className="font-bold text-green-600 text-sm">Rs. {calculateEarnings()}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Items</p>
                    <p className="font-bold text-gray-900">{order.items?.length || order.orderItems?.length || '1'}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => onViewDetails(order)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                >
                    <FaBox size={14} /> View Details
                </button>

                {canAccept && (
                    <button
                        onClick={() => onAccept(order._id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-black transition shadow-lg shadow-green-100"
                    >
                        Accept Order
                    </button>
                )}

                {canPickup && (
                    <button
                        onClick={() => onPickup(order._id)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-black transition flex items-center justify-center gap-2 shadow-lg shadow-orange-100"
                    >
                        <FaBox /> Mark as Picked Up
                    </button>
                )}

                {(isPickedUp || order.status === 'ArrivedAtCustomer') && (
                    <button
                        onClick={() => onDeliver(order._id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-black transition flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                    >
                        <FaCheckCircle /> Mark as Delivered
                    </button>
                )}

                {isAssignedToOther && (
                    <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-center border border-gray-200">
                        Assigned to Another Rider
                    </div>
                )}
            </div>
        </div>
    );
}
