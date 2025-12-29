'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaShoppingBag, FaLock, FaEnvelope, FaUser } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

export default function AdminRegisterForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [registeredUser, setRegisteredUser] = useState<any>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        // Validate password length
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            console.log('=== REGISTRATION ATTEMPT ===');
            console.log('Name:', name);
            console.log('Email:', email);
            console.log('API Base URL:', API_BASE_URL);
            console.log('Full URL:', `${API_BASE_URL}/api/admin/register`);

            const { data } = await axios.post(`${API_BASE_URL}/api/admin/register`, {
                name,
                email,
                password
            });

            console.log('Admin registration successful:', data);

            // Save admin info and token
            localStorage.setItem('userInfo', JSON.stringify(data));
            localStorage.setItem('token', data.token);

            // Store in state for display
            setRegisteredUser(data);

            // Show success message instead of redirecting
            setSuccess(true);
        } catch (err: any) {
            console.error('Registration error:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Success screen
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600 p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-4 rounded-2xl shadow-lg mb-4">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Account Created!</h1>
                        <p className="text-gray-500 text-center mt-2">Your admin account has been successfully created.</p>
                    </div>

                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
                        <p className="text-green-700 text-sm">
                            <strong>Email:</strong> {registeredUser?.email || email}
                        </p>
                        <p className="text-green-700 text-sm mt-1">
                            <strong>Role:</strong> {registeredUser?.role || 'admin'}
                        </p>
                    </div>

                    <button
                        onClick={() => router.push('/admin')}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all mb-3"
                    >
                        Go to Admin Dashboard
                    </button>

                    <Link href="/admin/login" className="block text-center text-gray-600 text-sm hover:text-purple-500">
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-4 rounded-2xl shadow-lg mb-4">
                        <FaShoppingBag className="text-3xl" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">FOODSWIPE</h1>
                    <p className="text-gray-500">Create Admin Account</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaUser className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaEnvelope className="text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value.trim())}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                placeholder="admin@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaLock className="text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Confirm Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaLock className="text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating Account...' : 'Create Admin Account'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600 text-sm">
                        Already have an admin account?{' '}
                        <Link href="/admin/login" className="text-purple-500 font-bold hover:text-purple-600">
                            Sign In
                        </Link>
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-center">
                        The first admin account will be created with super-admin privileges.
                    </p>
                </div>
            </div>
        </div>
    );
}
