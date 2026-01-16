'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPhone, FaLock, FaArrowRight, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import toast from 'react-hot-toast';
import { initRecaptcha, sendOTP as firebaseSendOTP, verifyOTP as firebaseVerifyOTP, cleanupRecaptcha } from '../utils/firebase-phone-auth';
import { ConfirmationResult } from 'firebase/auth';

interface PhoneAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PhoneAuthModal({ isOpen, onClose, onSuccess }: PhoneAuthModalProps) {
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+92');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Initialize reCAPTCHA
    useEffect(() => {
        if (isOpen && step === 'phone') {
            const timer = setTimeout(() => {
                try {
                    initRecaptcha('recaptcha-container');
                } catch (err) {
                    console.error('Failed to init recaptcha:', err);
                }
            }, 500);
            return () => {
                clearTimeout(timer);
                cleanupRecaptcha();
            };
        }
    }, [isOpen, step]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const validatePhoneNumber = (phone: string): boolean => {
        // Pakistan phone number: 10 digits (3XXXXXXXXX) or 11 digits (03XXXXXXXXX)
        const phoneRegex = /^(03|3)[0-9]{9}$/;
        return phoneRegex.test(phone);
    };

    const handleSendOTP = async () => {
        setError('');

        if (!validatePhoneNumber(phoneNumber)) {
            setError('Please enter a valid Pakistani phone number (e.g., 03XXXXXXXXX or 3XXXXXXXXX)');
            return;
        }

        // Format number: strip leading 0 and prepend country code
        const formattedPhone = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
        const fullNumber = `${countryCode}${formattedPhone}`;
        
        setLoading(true);

        try {
            // Check if user is logged in
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) {
                toast.error('Please login first');
                return;
            }

            console.log('📱 Sending OTP via Firebase to:', fullNumber);
            const result = await firebaseSendOTP(fullNumber);
            setConfirmationResult(result);
            
            toast.success('OTP sent successfully!');
            setStep('otp');
            setCountdown(60); // Firebase usually allows resend after 60s
        } catch (err: any) {
            console.error('Send OTP error:', err);
            const errorMessage = err.message || 'Failed to send OTP. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
            
            // If reCAPTCHA error, try re-initializing
            if (err.code === 'auth/captcha-check-failed' || err.code === 'auth/invalid-app-credential') {
                cleanupRecaptcha();
                initRecaptcha('recaptcha-container');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            setError('Please enter a 6-digit OTP');
            return;
        }

        if (!confirmationResult) {
            setError('Session expired. Please request a new OTP.');
            setStep('phone');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Verify OTP with Firebase
            console.log('🔐 Verifying OTP with Firebase...');
            const userCredential = await firebaseVerifyOTP(confirmationResult, otp);
            const idToken = await userCredential.user.getIdToken();
            
            // 2. Call backend to link phone and mark as verified
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) return;
            const userInfo = JSON.parse(userInfoStr);
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };

            const formattedPhone = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
            const fullNumber = `${countryCode}${formattedPhone}`;

            console.log('🔗 Linking phone number in backend...');
            const { data } = await axios.post(`${API_BASE_URL}/api/auth/verify-phone`, {
                idToken,
                phoneNumber: fullNumber
            }, config);

            // Update local storage
            const updatedUserInfo = { 
                ...userInfo, 
                phoneVerified: true, 
                phoneNumber: data.phoneNumber 
            };
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
            
            toast.success('Phone verified successfully!');
            onSuccess();
        } catch (err: any) {
            console.error('Verify OTP error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Invalid OTP. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white relative">
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                        >
                            <FaTimes size={20} />
                        </button>
                        <div className="flex flex-col items-center">
                            <div className="bg-white/20 p-4 rounded-full mb-4">
                                {step === 'phone' ? <FaPhone size={30} /> : <FaLock size={30} />}
                            </div>
                            <h2 className="text-2xl font-bold">Phone Verification</h2>
                            <p className="text-white/80 text-center mt-2">
                                {step === 'phone' 
                                    ? 'Enter your phone number to receive an OTP' 
                                    : `Enter the 6-digit code sent to ${countryCode} ${phoneNumber}`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8">
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
                                {error}
                            </div>
                        )}

                        {step === 'phone' ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                    <div className="flex gap-2">
                                        <div className="w-24 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 font-medium flex items-center justify-center">
                                            {countryCode}
                                        </div>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                            placeholder="3XXXXXXXXX"
                                            className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                                            maxLength={11}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Example: 3001234567</p>
                                </div>

                                {/* reCAPTCHA Container */}
                                <div id="recaptcha-container" className="flex justify-center mb-4"></div>

                                <button
                                    onClick={handleSendOTP}
                                    disabled={loading || !phoneNumber}
                                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Send OTP <FaArrowRight /></>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">6-Digit Code</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter OTP"
                                        className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                        maxLength={6}
                                    />
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={handleVerifyOTP}
                                        disabled={loading || otp.length !== 6}
                                        className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>Verify & Continue <FaCheckCircle /></>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleSendOTP}
                                        disabled={loading || countdown > 0}
                                        className="text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors disabled:opacity-50"
                                    >
                                        {countdown > 0 ? `Resend OTP in ${countdown}s` : "Didn't receive code? Resend"}
                                    </button>

                                    <button
                                        onClick={() => setStep('phone')}
                                        className="text-sm font-bold text-orange-500 hover:underline"
                                    >
                                        Change Phone Number
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-gray-50 text-center">
                        <p className="text-xs text-gray-400">
                            By continuing, you agree to receive an SMS for verification. 
                            Standard message and data rates may apply.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
