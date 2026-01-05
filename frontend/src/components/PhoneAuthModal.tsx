'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPhone, FaLock } from 'react-icons/fa';
import { sendOTP, verifyOTP, initRecaptcha, cleanupRecaptcha } from '../utils/firebase-phone-auth';
import { ConfirmationResult } from 'firebase/auth';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import toast from 'react-hot-toast';

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
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [recaptchaReady, setRecaptchaReady] = useState(false);

    // Initialize visible reCAPTCHA when modal opens
    useEffect(() => {
        if (isOpen && !recaptchaReady) {
            // Delay to ensure DOM is ready
            const timer = setTimeout(() => {
                try {
                    console.log('Initializing visible reCAPTCHA...');
                    initRecaptcha('recaptcha-container');
                    setRecaptchaReady(true);
                    console.log('Visible reCAPTCHA ready');
                } catch (err: any) {
                    console.error('reCAPTCHA init error:', err);
                    setError(`Verification error: ${err.message || 'Please refresh the page.'}`);
                }
            }, 1000); // Increased delay to 1000ms

            return () => clearTimeout(timer);
        }

        return () => {
            if (!isOpen) {
                cleanupRecaptcha();
                setRecaptchaReady(false);
            }
        };
    }, [isOpen]); // Removed recaptchaReady from dependencies

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const validatePhoneNumber = (phone: string): boolean => {
        // Pakistan phone number: 10 digits (3XXXXXXXXX)
        const phoneRegex = /^3[0-9]{9}$/;
        return phoneRegex.test(phone);
    };

    const handleSendOTP = async () => {
        setError('');

        if (!validatePhoneNumber(phoneNumber)) {
            setError('Please enter a valid Pakistani phone number (3XXXXXXXXX)');
            return;
        }

        const fullNumber = `${countryCode}${phoneNumber}`;
        setLoading(true);

        try {
            // DEVELOPMENT MODE BYPASS for reCAPTCHA issues
            // This allows testing without Firebase reCAPTCHA verification
            const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

            if (isDevelopment && countryCode === '+92') {
                console.log('🔧 DEVELOPMENT MODE: Bypassing Firebase OTP for testing');
                console.log('📱 Use test OTP code: 123456');

                // Create a mock confirmation result for development
                const mockConfirmationResult = {
                    confirm: async (code: string) => {
                        if (code === '123456') {
                            console.log('✅ Development OTP verified');
                            // Return a mock user credential
                            return {
                                user: {
                                    uid: 'dev-user-' + Date.now(),
                                    phoneNumber: fullNumber
                                }
                            };
                        } else {
                            throw { code: 'auth/invalid-verification-code', message: 'Invalid OTP' };
                        }
                    },
                    verificationId: 'dev-verification-' + Date.now()
                } as any;

                setConfirmationResult(mockConfirmationResult);
                setStep('otp');
                setCountdown(60);
                toast.success('Development Mode: Use OTP 123456');
                setLoading(false);
                return;
            }

            // PRODUCTION MODE: Use real Firebase OTP
            if (!recaptchaReady) {
                setError('Verification not ready. Please wait a moment.');
                setLoading(false);
                return;
            }

            console.log('Attempting to send OTP to:', fullNumber);
            const result = await sendOTP(fullNumber);
            console.log('OTP sent successfully');

            setConfirmationResult(result);
            setStep('otp');
            setCountdown(60);
            toast.success('OTP sent to your phone!');
        } catch (err: any) {
            console.error('Send OTP error:', err);
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);

            let errorMessage = 'Failed to send OTP. Please try again.';

            if (err.code === 'auth/internal-error') {
                errorMessage = 'Phone verification setup issue. Please ensure Phone sign-in is enabled in Firebase Console.';
            } else if (err.code === 'auth/invalid-phone-number') {
                errorMessage = 'Invalid phone number format';
            } else if (err.code === 'auth/too-many-requests') {
                errorMessage = 'Too many attempts. Please try again later.';
            } else if (err.code === 'auth/quota-exceeded') {
                errorMessage = 'SMS quota exceeded. Please contact support.';
            } else if (err.message?.includes('reCAPTCHA')) {
                errorMessage = 'Please complete the reCAPTCHA challenge and try again.';
            } else if (err.code === 'auth/invalid-app-credential') {
                errorMessage = 'Configuration Error: Domain not authorized or App Check failed. See console for details.';
            } else if (err.code === 'auth/captcha-check-failed') {
                errorMessage = 'reCAPTCHA verification failed. Using development mode instead - try again!';
            }

            setError(errorMessage);
            toast.error(errorMessage);

            // DEBUG: Show detailed error in console and potentially UI
            console.error('❌ Detailed Error for Debugging:', {
                code: err.code,
                message: err.message,
                stack: err.stack,
                fullError: err
            });

            // If it's a generic error, append the code for visibility
            if (errorMessage === 'Failed to send OTP. Please try again.') {
                setError(`Failed to send OTP (${err.code || err.message}). Please try again.`);
            }

            // Reinitialize reCAPTCHA for retry
            setRecaptchaReady(false);
            setTimeout(() => {
                try {
                    initRecaptcha('recaptcha-container');
                    setRecaptchaReady(true);
                } catch (e) {
                    console.error('Failed to reinitialize reCAPTCHA:', e);
                }
            }, 1000);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!confirmationResult) return;

        setError('');
        if (otp.length !== 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }

        setLoading(true);

        try {
            // Verify OTP with Firebase
            const result = await verifyOTP(confirmationResult, otp);
            console.log('Firebase verification successful:', result);

            // Update backend with verified phone
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found in localStorage');
                throw new Error('Authentication token missing');
            }

            const fullNumber = `${countryCode}${phoneNumber}`;
            console.log('Calling backend verify-phone with:', { fullNumber, hasToken: !!token });

            await axios.post(
                `${API_BASE_URL}/api/auth/verify-phone`,
                { phoneNumber: fullNumber },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update localStorage
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            userInfo.phoneVerified = true;
            userInfo.phoneNumber = fullNumber;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));

            toast.success('Phone verified successfully!');
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Verify OTP error:', err);
            console.error('Error details:', {
                code: err.code,
                message: err.message,
                fullError: JSON.stringify(err, null, 2)
            });

            let errorMessage = 'Invalid OTP. Please try again.';

            if (err.code === 'auth/invalid-verification-code') {
                errorMessage = 'Invalid OTP code';
            } else if (err.code === 'auth/code-expired') {
                errorMessage = 'OTP expired. Please request a new one.';
            }

            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep('phone');
        setPhoneNumber('');
        setOtp('');
        setError('');
        setConfirmationResult(null);
        setCountdown(0);
        cleanupRecaptcha();
        setRecaptchaReady(false);
        onClose();
    };

    const handleResendOTP = () => {
        setOtp('');
        setError('');
        setStep('phone');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                                {step === 'phone' ? <FaPhone className="text-white text-xl" /> : <FaLock className="text-white text-xl" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {step === 'phone' ? 'Verify Phone Number' : 'Enter OTP'}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {step === 'phone' ? 'Required to place orders' : `Sent to ${countryCode}${phoneNumber}`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            <FaTimes className="text-gray-500" />
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Phone Input Screen */}
                    {step === 'phone' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <div className="flex gap-2 mb-4">
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="w-24 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                >
                                    <option value="+92">🇵🇰 +92</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+44">🇬🇧 +44</option>
                                </select>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    placeholder="3001234567"
                                    maxLength={10}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                            </div>



                            <button
                                onClick={handleSendOTP}
                                disabled={loading || !phoneNumber || !recaptchaReady}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                            >
                                {loading ? 'Sending...' : !recaptchaReady ? 'Initializing...' : 'Send OTP'}
                            </button>
                        </div>
                    )}

                    {/* OTP Input Screen */}
                    {step === 'otp' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter 6-Digit OTP
                            </label>
                            <input
                                type="tel"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                maxLength={6}
                                autoFocus
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-center text-2xl tracking-widest font-bold mb-4"
                            />

                            <button
                                onClick={handleVerifyOTP}
                                disabled={loading || otp.length !== 6}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition mb-3"
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>

                            <div className="text-center">
                                {countdown > 0 ? (
                                    <p className="text-sm text-gray-500">
                                        Resend OTP in {countdown}s
                                    </p>
                                ) : (
                                    <button
                                        onClick={handleResendOTP}
                                        disabled={loading}
                                        className="text-sm text-orange-500 font-semibold hover:text-orange-600 transition"
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setStep('phone')}
                                className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition"
                            >
                                ← Change Phone Number
                            </button>
                        </div>
                    )}
                    {/* reCAPTCHA container - Always present but hidden if not needed */}
                    <div className="mb-4" style={{ display: step === 'phone' ? 'block' : 'none' }}>
                        <div id="recaptcha-container"></div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
