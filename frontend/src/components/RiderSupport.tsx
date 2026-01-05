'use client';

import React from 'react';
import { FaPhoneAlt, FaComments, FaExclamationCircle, FaMapMarkerAlt, FaUserSlash, FaClock } from 'react-icons/fa';

export default function RiderSupport() {
    const handleEmergencyCall = () => {
        window.location.href = 'tel:+923295599855';
    };

    const handleEmailSupport = () => {
        window.location.href = 'mailto:app.foodswipehelp@gmail.com';
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Help & Support</h1>
                <p className="text-sm text-gray-600">We're here to help you</p>
            </div>

            {/* Emergency Support */}
            <div className="px-6 py-6">
                <button
                    onClick={() => window.location.href = 'tel:+923295599855'}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 flex items-center gap-4 text-white shadow-lg hover:from-red-600 hover:to-red-700 transition"
                >
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <FaExclamationCircle className="text-3xl" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-bold text-lg mb-1">Emergency Support</h3>
                        <p className="text-sm opacity-90">Tap to call support immediately</p>
                    </div>
                </button>
            </div>

            {/* Chat Support */}
            <div className="px-6 mb-6">
                <button className="w-full bg-gradient-to-r from-orange-500 to-pink-600 rounded-2xl p-6 flex items-center gap-4 text-white shadow-md hover:from-orange-600 hover:to-pink-700 transition">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <FaComments className="text-3xl" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-bold text-lg mb-1">Chat with Support</h3>
                        <p className="text-sm opacity-90">Average response time 2 minutes</p>
                    </div>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Call Support */}
            <div className="px-6 mb-4">
                <button
                    onClick={() => window.location.href = 'tel:+923295599855'}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition border border-gray-100"
                >
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <FaPhoneAlt className="text-green-600 text-xl" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold text-gray-900">Call Support</h3>
                        <p className="text-sm text-gray-600">+92 329 5599855</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Email Support */}
            <div className="px-6 mb-6">
                <button
                    onClick={handleEmailSupport}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition border border-gray-100"
                >
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <FaComments className="text-blue-600 text-xl" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold text-gray-900">Email Support</h3>
                        <p className="text-sm text-gray-600">app.foodswipehelp@gmail.com</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Common Issues */}
            <div className="px-6 mb-6">
                <h2 className="font-semibold text-gray-900 mb-3">Common Issues</h2>
                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
                    <IssueItem
                        icon={<FaMapMarkerAlt className="text-orange-600" />}
                        title="Wrong Address"
                        subtitle="Customer provided incorrect address"
                    />
                    <IssueItem
                        icon={<FaUserSlash className="text-orange-600" />}
                        title="Customer Not Responding"
                        subtitle="Unable to contact customer"
                    />
                    <IssueItem
                        icon={<FaClock className="text-orange-600" />}
                        title="Restaurant Delays"
                        subtitle="Order is taking too long"
                    />
                </div>
            </div>

            {/* FAQs */}
            <div className="px-6 mb-6">
                <h2 className="font-semibold text-gray-900 mb-3">Frequently Asked Questions</h2>
                <div className="space-y-3">
                    <FAQItem
                        question="How do I update my bank details?"
                        answer="Go to Profile > Settings > Bank Account to update your payment information"
                    />
                    <FAQItem
                        question="When will I receive my payout?"
                        answer="Payouts are processed every Friday for the previous week's earnings"
                    />
                    <FAQItem
                        question="What if customer cancels the order?"
                        answer="If the order is cancelled after pickup, you will receive partial payment. Contact support for assistance"
                    />
                    <FAQItem
                        question="How is my rating calculated?"
                        answer="Your rating is the average of all customer ratings you've received for completed deliveries"
                    />
                </div>
            </div>

            {/* Support Hours */}
            <div className="px-6 mb-6">
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">Support Hours</h3>
                    <p className="text-sm text-orange-800 mb-1"><span className="font-medium">Monday - Friday:</span> 9:00 AM - 9:00 PM</p>
                    <p className="text-sm text-orange-800 mb-3"><span className="font-medium">Saturday - Sunday:</span> 10:00 AM - 6:00 PM</p>
                    <p className="text-xs text-orange-700">Emergency support available 24/7</p>
                </div>
            </div>
        </div>
    );
}

function IssueItem({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <button className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-600">{subtitle}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">{question}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">{answer}</p>
        </div>
    );
}
