'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaBicycle, FaArrowLeft } from 'react-icons/fa';

interface RiderRegistrationProps {
    onComplete: (riderId: string) => void;
}

export default function RiderRegistration({ onComplete }: RiderRegistrationProps) {
    const [formData, setFormData] = useState({
        fullName: '',
        cnicNumber: '',
        dateOfBirth: '',
        vehicleType: 'Bike' as 'Bike' | 'Car',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const formatCNIC = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const limitedDigits = digits.slice(0, 13);
        if (limitedDigits.length <= 5) return limitedDigits;
        if (limitedDigits.length <= 12) return `${limitedDigits.slice(0, 5)}-${limitedDigits.slice(5, 12)}`;
        return `${limitedDigits.slice(0, 5)}-${limitedDigits.slice(5, 12)}-${limitedDigits.slice(12)}`;
    };

    const handleCNICChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, cnicNumber: formatCNIC(e.target.value) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            if (!token) throw new Error('Please login again.');

            const res = await axios.post(`${API_BASE_URL}/api/riders/register`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onComplete(res.data._id);
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-pink-600 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <button
                    onClick={handleBackToLogin}
                    className="flex items-center gap-2 text-white/90 hover:text-white mb-4 font-normal transition"
                >
                    <FaArrowLeft size={14} /> Back to Login
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FaBicycle className="text-orange-500 text-2xl" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Rider Portal</h1>
                    <p className="text-white/90 font-light">Join our delivery team</p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-2xl">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Details</h2>
                        <p className="text-sm text-gray-500 font-light">Complete your profile to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm font-light"
                                    placeholder="Muhammad Ali"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Number</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.cnicNumber}
                                    onChange={handleCNICChange}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm font-light"
                                    placeholder="12345-1234567-1"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    required
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm font-light"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, vehicleType: 'Bike' })}
                                    className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${formData.vehicleType === 'Bike'
                                        ? 'border-orange-500 bg-orange-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <FaBicycle className={`text-2xl ${formData.vehicleType === 'Bike' ? 'text-orange-500' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${formData.vehicleType === 'Bike' ? 'text-orange-600' : 'text-gray-600'}`}>Bike</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, vehicleType: 'Car' })}
                                    className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${formData.vehicleType === 'Car'
                                        ? 'border-orange-500 bg-orange-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <svg className={`w-8 h-8 ${formData.vehicleType === 'Car' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    <span className={`text-sm font-medium ${formData.vehicleType === 'Car' ? 'text-orange-600' : 'text-gray-600'}`}>Car</span>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm font-light">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-semibold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? 'Processing...' : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
