'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaPen } from 'react-icons/fa';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
    // Enable swipe back gesture
    useSwipeBack({ onSwipeBack: onClose });

    // Mock data if user data is missing
    const userData = {
        name: user?.name || 'John Doe',
        email: user?.email || 'john.doe@email.com',
        phone: user?.phone || '+923295599855',
        address: user?.address || 'Gulberg III, Lahore, Pakistan',
        memberSince: 'January 2024',
        avatar: user?.avatar
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 w-full h-[90vh] bg-gray-50 z-50 rounded-t-3xl overflow-hidden flex flex-col"
                    >
                        {/* Header with Gradient */}
                        <div className="relative h-48 bg-gradient-orange-red flex items-start justify-between p-6">
                            <h2 className="text-white text-xl font-bold mt-2">My Profile</h2>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition"
                            >
                                <FaTimes size={20} />
                            </button>

                            {/* Avatar Section - Positioned to overlap header and body */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex flex-col items-center">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full bg-white p-1 shadow-xl">
                                        <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {userData.avatar ? (
                                                <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <FaUser className="text-primary text-5xl" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button className="mt-4 flex items-center gap-2 px-6 py-2 bg-primary/10 text-primary rounded-full font-bold text-sm hover:bg-primary/20 transition">
                                    <FaPen size={12} />
                                    Edit Photo
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto pt-24 px-6 pb-24">
                            <div className="space-y-4">
                                {/* Full Name */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-primary">
                                            <FaUser size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">Full Name</p>
                                            <p className="text-gray-900 font-bold text-lg">{userData.name}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-primary">
                                            <FaEnvelope size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">Email</p>
                                            <p className="text-gray-900 font-bold text-lg">{userData.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-primary">
                                            <FaPhone size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">Phone</p>
                                            <p className="text-gray-900 font-bold text-lg">{userData.phone}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-primary shrink-0">
                                            <FaMapMarkerAlt size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">Address</p>
                                            <p className="text-gray-900 font-bold text-lg whitespace-pre-line">{userData.address}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Member Since */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-primary">
                                            <FaCalendarAlt size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">Member Since</p>
                                            <p className="text-gray-900 font-bold text-lg">{userData.memberSince}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="absolute bottom-0 left-0 w-full p-6 bg-white border-t border-gray-100">
                            <button className="w-full py-4 bg-gradient-orange-red text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 active:scale-95 transition-transform">
                                Edit Profile
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
