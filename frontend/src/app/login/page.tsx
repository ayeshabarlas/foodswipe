'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/config';
import { FaGoogle, FaEnvelope, FaExclamationCircle } from 'react-icons/fa';
import { auth, googleProvider } from '@/config/firebase';
import { signInWithPopup } from 'firebase/auth';

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'signup' | 'select'>('select');
    const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            // CRITICAL: Refresh token to ensure it's not expired
            const token = await result.user.getIdToken(true);

            // Send to backend
            const { data } = await axios.post(`${API_BASE_URL}/api/auth/verify-firebase-token`, {
                idToken: token,
                email: result.user.email,
                name: result.user.displayName,
                role: 'customer' // Default role
            });

            handleAuthSuccess(data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (emailMode === 'signup') {
                const fullName = `${formData.firstName} ${formData.lastName}`.trim();
                const { data } = await axios.post(`${API_BASE_URL}/api/auth/register`, {
                    name: fullName,
                    email: formData.email,
                    password: formData.password,
                    role: 'customer' // Default
                });
                handleAuthSuccess(data);
            } else {
                const { data } = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                    identifier: formData.email,
                    password: formData.password,
                    role: 'customer' // Default
                });
                handleAuthSuccess(data);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAuthSuccess = (data: any) => {
        localStorage.setItem('userInfo', JSON.stringify(data));

        // Check for redirect param
        const params = new URLSearchParams(window.location.search);
        const redirectPath = params.get('redirect');

        if (redirectPath) {
            router.push(redirectPath);
            return;
        }

        // Default redirect based on role
        if (data.role === 'restaurant') router.push('/restaurant');
        else if (data.role === 'admin') router.push('/admin');
        else if (data.role === 'rider') router.push('/rider');
        else router.push('/'); // Customer
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center overflow-y-auto">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
                {/* Header Image/Logo Placeholder */}
                <div className="bg-gradient-orange-red h-32 flex items-center justify-center">
                    <h1 className="text-4xl font-bold text-white tracking-tight">FoodSwipe</h1>
                </div>

                <div className="p-8">
                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                        {mode === 'select' ? "Let's get started" :
                            emailMode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-gray-500 text-center mb-8 text-sm">
                        Order food, track orders, and more.
                    </p>

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                            <FaExclamationCircle /> {error}
                        </div>
                    )}

                    {mode === 'select' ? (
                        <div className="space-y-4">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition"
                            >
                                <FaGoogle className="text-red-500" /> Use Google URL
                            </button>

                            <button
                                onClick={() => setMode('login')}
                                className="w-full bg-gradient-orange-red text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition shadow-lg shadow-orange-500/30"
                            >
                                <FaEnvelope /> Continue with Email
                            </button>

                            <p className="text-xs text-gray-400 text-center mt-4">
                                By continuing, you agree to our Terms of Service & Privacy Policy.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            {emailMode === 'signup' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">First Name</label>
                                        <input
                                            name="firstName"
                                            type="text"
                                            required
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Last Name</label>
                                        <input
                                            name="lastName"
                                            type="text"
                                            required
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 ml-1">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 ml-1">Password</label>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3.5 px-4 rounded-xl hover:from-orange-600 hover:to-red-600 transition shadow-lg shadow-orange-500/30 mt-4"
                            >
                                {loading ? 'Processing...' : (emailMode === 'login' ? 'Login' : 'Create Account')}
                            </button>

                            <div className="flex items-center justify-between mt-6">
                                <button
                                    type="button"
                                    onClick={() => setMode('select')}
                                    className="text-gray-400 text-sm hover:text-gray-600"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEmailMode(emailMode === 'login' ? 'signup' : 'login')}
                                    className="text-orange-500 font-semibold text-sm hover:text-orange-600"
                                >
                                    {emailMode === 'login' ? 'Create new account' : 'I have an account'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
