'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    FaPhone,
    FaEnvelope,
    FaWhatsapp,
    FaComments,
    FaClock,
    FaHeadphones
} from 'react-icons/fa';

export default function DashboardSupport() {
    const [copiedPhone, setCopiedPhone] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    const handleCopyPhone = () => {
        navigator.clipboard.writeText('+1-800-FOODSWIPE');
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
            icon: FaEnvelope,
            title: 'Email Support',
            description: 'Send us your queries',
            value: 'app.foodswipehelp@gmail.com',
            action: () => window.open('mailto:app.foodswipehelp@gmail.com'),
            secondaryAction: handleCopyEmail,
            secondaryLabel: copiedEmail ? 'Copied!' : 'Copy',
            color: 'from-orange-500 to-pink-600'
        }
    ];

    return (
        <div className="p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-white rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white rounded-full blur-2xl" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <FaHeadphones className="text-3xl" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold">Customer Support</h2>
                            <p className="text-white/80 mt-1 text-lg">We're here to help you grow your business 24/7</p>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                            <FaClock className="text-lg" />
                        </div>
                        <div>
                            <p className="text-xs text-white/80 uppercase font-bold tracking-wider">Status</p>
                            <p className="font-semibold">Support Online</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Options */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Channels</h3>
                    {contactOptions.map((option, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 bg-gradient-to-br ${option.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
                                    <option.icon size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-lg">{option.title}</h3>
                                    <p className="text-gray-500">{option.description}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={option.action}
                                        className={`px-4 py-2 bg-gradient-to-r ${option.color} text-white rounded-lg font-medium text-sm shadow hover:shadow-lg transition-all`}
                                    >
                                        Contact
                                    </button>
                                    {option.secondaryAction && (
                                        <button
                                            onClick={option.secondaryAction}
                                            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg font-medium text-sm transition-colors border border-gray-200"
                                        >
                                            {option.secondaryLabel}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* FAQ & Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Common Questions & Resources</h3>

                        <div className="space-y-4">
                            {[
                                { q: 'How do I track my delivery orders?', a: 'Use the "Orders" tab to see real-time status of all active orders.' },
                                { q: 'When do I get paid?', a: 'Payments are processed weekly every Monday for the previous week.' },
                                { q: 'How to update my menu?', a: 'Go to the "Menu" tab to add, edit, or remove dishes instantly.' },
                                { q: 'Can I change my operating hours?', a: 'Yes, visit "Store" settings to update your opening and closing times.' },
                            ].map((item, i) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <h4 className="font-bold text-gray-900 mb-2">{item.q}</h4>
                                    <p className="text-gray-600 text-sm">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
