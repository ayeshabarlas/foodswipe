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
    const [timeLeft, setTimeLeft] = useState(12);

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-pink-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
                    >
                        <FaTimes />
                    </button>

                    <h2 className="text-2xl font-bold mb-2">New Order!</h2>

                    {/* Countdown Timer */}
                    <div className="flex items-center justify-center mt-4">
                        <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="rgba(255,255,255,0.3)"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="white"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 36}`}
                                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - timeLeft / 12)}`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold">{timeLeft}s</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Details */}
                <div className="p-6 space-y-4">
                    {/* Pickup Location */}
                    <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shrink-0">
                            <FaMapMarkerAlt />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-green-700 mb-1">Pickup from</p>
                            <p className="font-semibold text-gray-900">{order.restaurant.name}</p>
                            <p className="text-sm text-gray-600 font-light">{order.restaurant.address}</p>
                        </div>
                    </div>

                    {/* Delivery Location */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shrink-0">
                            <FaMapMarkerAlt />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-blue-700 mb-1">Deliver to</p>
                            <p className="font-semibold text-gray-900">Customer Address</p>
                            <p className="text-sm text-gray-600 font-light">{order.deliveryAddress}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <FaRoute className="text-gray-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-500 mb-1">Distance</p>
                            <p className="font-bold text-gray-900">{order.distance} km</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <FaDollarSign className="text-green-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-500 mb-1">Earnings</p>
                            <p className="font-bold text-green-600">Rs. {order.earnings}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <FaClock className="text-gray-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-500 mb-1">Estimate</p>
                            <p className="font-bold text-gray-900">{order.estimatedTime} min</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 grid grid-cols-2 gap-3">
                    <button
                        onClick={onReject}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                    >
                        Reject
                    </button>
                    <button
                        onClick={onAccept}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-pink-700 transition shadow-lg"
                    >
                        Accept Order
                    </button>
                </div>
            </div>
        </div>
    );
}
