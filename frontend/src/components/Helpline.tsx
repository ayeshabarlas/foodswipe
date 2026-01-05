'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaTimes,
    FaPhone,
    FaEnvelope,
    FaWhatsapp,
    FaComments,
    FaClock,
    FaHeadphones
} from 'react-icons/fa';

interface HelplineProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Helpline({ isOpen, onClose }: HelplineProps) {
    const [copiedPhone, setCopiedPhone] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    const handleCopyPhone = () => {
        navigator.clipboard.writeText('+92 329 5599855');
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText('app.foodswipehelp@gmail.com');
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const contactOptions = [
        {
            icon: FaPhone,
            title: 'Call Us',
            description: 'Speak directly with our support team',
            value: '+92 329 5599855',
            action: () => window.open('tel:+923295599855'),
            secondaryAction: handleCopyPhone,
            secondaryLabel: copiedPhone ? 'Copied!' : 'Copy',
            color: 'from-blue-500 to-blue-600'
        },
        {
            icon: FaWhatsapp,
            title: 'WhatsApp',
            description: 'Chat with us on WhatsApp',
            value: '+92 329 5599855',
            action: () => window.open('https://wa.me/923295599855', '_blank'),
            color: 'from-green-500 to-green-600'
        },
        {
            icon: FaEnvelope,
            title: 'Email Support',
            description: 'Send us your queries',
            value: 'app.foodswipehelp@gmail.com',
            action: () => window.open('mailto:app.foodswipehelp@gmail.com'),
            secondaryAction: handleCopyEmail,
            secondaryLabel: copiedEmail ? 'Copied!' : 'Copy',
            color: 'from-orange-500 to-pink-600'
        },
        {
            icon: FaComments,
            title: 'Live Chat',
            description: 'Get instant help from our team',
            value: 'Start conversation',
            action: () => {
                // This would open the live chat system
                alert('Live chat feature coming soon!');
            },
            color: 'from-purple-500 to-purple-600'
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header with gradient */}
                        <div className="relative bg-gradient-to-br from-orange-500 to-pink-600 p-6 text-white overflow-hidden">
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full blur-2xl" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                            <FaHeadphones size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">Customer Support</h2>
                                            <p className="text-sm text-white/80">We're here to help 24/7</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-colors"
                                    >
                                        <FaTimes size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Operating Hours */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                        <FaClock size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Available 24/7</h3>
                                        <p className="text-sm text-gray-600">We're always here when you need us</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Options */}
                            <div className="space-y-3">
                                {contactOptions.map((option, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="group bg-white border border-gray-100 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 bg-gradient-to-br ${option.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                                                <option.icon size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 mb-1">{option.title}</h3>
                                                <p className="text-sm text-gray-500 mb-2">{option.description}</p>
                                                <p className="text-sm font-medium text-gray-700">{option.value}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={option.action}
                                                className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${option.color} text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all`}
                                            >
                                                Contact Now
                                            </motion.button>
                                            {option.secondaryAction && (
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={option.secondaryAction}
                                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                                                >
                                                    {option.secondaryLabel}
                                                </motion.button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* FAQ Section */}
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mt-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Common Questions</h3>
                                <div className="space-y-2 text-sm">
                                    <p className="text-gray-600">
                                        <span className="font-medium text-gray-900">• Order issues:</span> Contact us immediately for tracking or delivery problems
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="font-medium text-gray-900">• Refunds:</span> Allow 3-5 business days for processing
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="font-medium text-gray-900">• Account help:</span> Email us for password or account issues
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="font-medium text-gray-900">• Restaurant partners:</span> Use the Restaurant Portal for business inquiries
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
