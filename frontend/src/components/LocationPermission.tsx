'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaCheck, FaLock } from 'react-icons/fa';

interface LocationPermissionProps {
    onAllow: () => void;
    onDeny: () => void;
}

export default function LocationPermission({ onAllow, onDeny }: LocationPermissionProps) {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1e293b] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-700/50"
            >
                {/* Icon */}
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <FaMapMarkerAlt className="text-4xl text-white" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-medium text-white text-center mb-3">
                    Find Food Near You
                </h2>

                {/* Description */}
                <p className="text-gray-300 text-center mb-8 leading-relaxed text-sm px-4">
                    We need your location to show you restaurants nearby and calculate delivery distances.
                </p>

                {/* Features List */}
                <div className="space-y-4 mb-8 px-2">
                    <div className="flex items-center gap-3 text-gray-200">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <FaCheck className="text-white text-[10px]" />
                        </div>
                        <p className="text-sm">See distance to each restaurant</p>
                    </div>
                    <div className="flex items-center gap-3 text-gray-200">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <FaCheck className="text-white text-[10px]" />
                        </div>
                        <p className="text-sm">Accurate delivery time estimates</p>
                    </div>
                    <div className="flex items-center gap-3 text-gray-200">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <FaCheck className="text-white text-[10px]" />
                        </div>
                        <p className="text-sm">Discover nearby hidden gems</p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={onAllow}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <FaMapMarkerAlt size={16} />
                        Allow Location Access
                    </button>
                    <button
                        onClick={onDeny}
                        className="w-full bg-slate-700/50 text-gray-300 font-medium py-3.5 rounded-xl hover:bg-slate-700 transition-colors"
                    >
                        Skip for Now
                    </button>
                </div>

                {/* Privacy Note */}
                <div className="flex items-start gap-2 mt-6 justify-center text-center px-4">
                    <FaLock className="text-yellow-500 mt-0.5 flex-shrink-0" size={12} />
                    <p className="text-xs text-gray-400 leading-tight text-left">
                        Your location is only used to show nearby restaurants and is never shared with third parties.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
