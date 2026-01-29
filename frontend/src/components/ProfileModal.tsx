'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaPen, FaReceipt, FaTicketAlt, FaQuestionCircle, FaSignOutAlt } from 'react-icons/fa';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onOpenOrders?: () => void;
    onOpenVouchers?: () => void;
    onOpenHelp?: () => void;
    onLogout?: () => void;
}

export default function ProfileModal({ isOpen, onClose, user, onOpenOrders, onOpenVouchers, onOpenHelp, onLogout }: ProfileModalProps) {
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

                            {/* Menu Sections */}
                            <div className="mt-8 space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Account Features</h3>
                                
                                <button 
                                    onClick={() => {
                                        onClose();
                                        onOpenOrders?.();
                                    }}
                                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-primary/30 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <FaReceipt size={18} />
                                        </div>
                                        <span className="font-bold text-gray-800">My Orders</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                                        <FaPen size={10} className="rotate-90" />
                                    </div>
                                </button>

                                <button 
                                    onClick={() => {
                                        onClose();
                                        onOpenVouchers?.();
                                    }}
                                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-primary/30 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                            <FaTicketAlt size={18} />
                                        </div>
                                        <span className="font-bold text-gray-800">Offers & Vouchers</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                                        <FaPen size={10} className="rotate-90" />
                                    </div>
                                </button>

                                <button 
                                    onClick={() => {
                                        onClose();
                                        onOpenHelp?.();
                                    }}
                                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-primary/30 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                            <FaQuestionCircle size={18} />
                                        </div>
                                        <span className="font-bold text-gray-800">Help & Support</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                                        <FaPen size={10} className="rotate-90" />
                                    </div>
                                </button>

                                <div className="pt-4">
                                    <button 
                                        onClick={onLogout}
                                        className="w-full bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-4 hover:bg-red-100 transition-all active:scale-[0.98]"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-red-600 shadow-sm">
                                            <FaSignOutAlt size={18} />
                                        </div>
                                        <span className="font-bold text-red-600">Logout</span>
                                    </button>
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
