'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaMapMarkerAlt, FaRoute, FaDollarSign, FaClock } from 'react-icons/fa';

interface OrderNotificationProps {
    order: {
        _id: string;
        orderNumber: string;
        restaurant: {
            name: string;
            address: string;
        };
        deliveryAddress: string;
        distance: number;
        earnings: number;
        estimatedTime: number;
    };
    onAccept: () => void;
    onReject: () => void;
    onClose: () => void;
}

export default function OrderNotificationModal({ order, onAccept, onReject, onClose }: OrderNotificationProps) {
    const [timeLeft, setTimeLeft] = useState(15);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onReject();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onReject]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
            <div className="bg-[#111111] w-full max-w-md rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-500">
                {/* Header with Countdown */}
                <div className="relative pt-10 pb-6 px-8 text-center">
                    <div className="absolute top-6 right-6">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-white/20 hover:text-white transition-colors"
                        >
                            <FaTimes size={12} />
                        </button>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-[#FF4D00]/10 text-[#FF4D00] px-3 py-1.5 rounded-full mb-6 border border-[#FF4D00]/20">
                        <div className="w-1.5 h-1.5 bg-[#FF4D00] rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[1.5px]">New Order Request</span>
                    </div>

                    <div className="relative w-28 h-28 mx-auto mb-6">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="56"
                                cy="56"
                                r="52"
                                stroke="rgba(255,255,255,0.03)"
                                strokeWidth="6"
                                fill="none"
                            />
                            <circle
                                cx="56"
                                cy="56"
                                r="52"
                                stroke="#FF4D00"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 52}`}
                                strokeDashoffset={`${2 * Math.PI * 52 * (1 - timeLeft / 15)}`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-linear"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white leading-none">{timeLeft}</span>
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[2px] mt-1">Sec</span>
                        </div>
                    </div>

                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[2px] mb-1">Potential Earning</p>
                    <h2 className="text-white text-4xl font-black tracking-tight">PKR {order.earnings || 180}</h2>
                </div>

                {/* Details Card */}
                <div className="px-5 pb-8">
                    <div className="bg-white/5 rounded-[32px] p-5 space-y-6 border border-white/5">
                        {/* Locations */}
                        <div className="relative space-y-5">
                            <div className="absolute left-[14px] top-[24px] bottom-[24px] w-[1px] border-l border-dashed border-white/20" />
                            
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-7 h-7 bg-[#FF4D00] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#FF4D00]/20">
                                    <FaMapMarkerAlt size={10} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[#FF4D00] text-[8px] font-black uppercase tracking-[1.5px] mb-0.5">Pickup Location</p>
                                    <p className="text-white font-black text-[13px] leading-tight">{order.restaurant.name}</p>
                                    <p className="text-white/40 text-[10px] mt-0.5 line-clamp-1">{order.restaurant.address}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-7 h-7 bg-[#00D97E] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#00D97E]/20">
                                    <FaMapMarkerAlt size={10} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[#00D97E] text-[8px] font-black uppercase tracking-[1.5px] mb-0.5">Dropoff Location</p>
                                    <p className="text-white font-black text-[13px] leading-tight">Customer Address</p>
                                    <p className="text-white/40 text-[10px] mt-0.5 line-clamp-1">{order.deliveryAddress}</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                            <div className="bg-white/5 rounded-2xl p-3.5">
                                <p className="text-white/30 text-[8px] font-black uppercase tracking-[1.5px] mb-1">Distance</p>
                                <div className="flex items-center gap-2">
                                    <FaRoute className="text-[#FF4D00]" size={12} />
                                    <p className="text-white font-black text-sm">{order.distance || '3.5'} <span className="text-[10px] text-white/20">KM</span></p>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3.5">
                                <p className="text-white/30 text-[8px] font-black uppercase tracking-[1.5px] mb-1">Time</p>
                                <div className="flex items-center gap-2">
                                    <FaClock className="text-[#00D97E]" size={12} />
                                    <p className="text-white font-black text-sm">{order.estimatedTime || '15-20'} <span className="text-[10px] text-white/20">MIN</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onReject}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 border border-white/5"
                        >
                            Reject
                        </button>
                        <button
                            onClick={onAccept}
                            className="flex-[2] bg-[#FF4D00] hover:bg-[#FF3300] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-[#FF4D00]/20 transition-all active:scale-95"
                        >
                            Accept Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
