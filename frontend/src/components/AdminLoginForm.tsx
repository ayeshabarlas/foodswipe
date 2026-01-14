'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaShoppingBag, FaLock, FaEnvelope } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

export default function AdminLoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('=== ADMIN LOGIN ATTEMPT ===');
            console.log('Email:', email);
            console.log('Password length:', password.length);
            const { data } = await axios.post(`${API_BASE_URL}/api/admin/login`, {
                identifier: email.trim(),
                password
            });

            console.log('Login response:', data);

            // Safer check for admin role
            const isAdmin = data.isAdmin || (data.role && data.role.includes && data.role.includes('admin')) || data.role === 'admin' || data.role === 'super-admin';

            if (isAdmin) {
                localStorage.setItem('userInfo', JSON.stringify(data));
                localStorage.setItem('token', data.token);
                router.push('/admin');
            } else {
                console.error('Authorization failed. Data:', data);
                // Debugging: show what we got
                const debugInfo = JSON.stringify(data);
                setError(`Not authorized. Got: ${debugInfo.substring(0, 100)}...`);
            }
        } catch (err: any) {
            console.error('Login error:', err);
            console.error('Error response:', err.response?.data);
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-gradient-to-br from-orange-500 to-pink-500 text-white p-4 rounded-2xl shadow-lg mb-4">
                        <FaShoppingBag className="text-3xl" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">FOODSWIPE</h1>
                    <p className="text-gray-500">Admin Dashboard</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded relative">
                        <p>{error}</p>
                        <button 
                            onClick={async () => {
                                try {
                                    setError("Checking connection...");
                                    const res = await axios.get(`${API_BASE_URL}/health?t=${Date.now()}`);
                                    alert(`Backend is reachable! \nURL: ${API_BASE_URL} \nStatus: ${JSON.stringify(res.data)}`);
                                    setError("");
                                } catch (e: any) {
                                    alert(`Backend unreachable! \nURL: ${API_BASE_URL} \nError: ${e.message}`);
                                    setError(`Backend Unreachable: ${e.message}. URL: ${API_BASE_URL}`);
                                }
                            }}
                            className="mt-2 text-xs font-bold underline hover:text-red-900"
                        >
                            Check Connectivity
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
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
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                                placeholder="admin@foodswipe.com"
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
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center text-gray-600 text-sm cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 mr-2" />
                            Remember me
                        </label>
                        <Link href="/forgot-password" className="text-sm font-bold text-orange-500 hover:text-orange-600">
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600 text-sm">
                        Don't have an admin account?{' '}
                        <Link href="/admin/register" className="text-orange-500 font-bold hover:text-orange-600">
                            Create Account
                        </Link>
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium mb-3">Admin Roles:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="flex items-center space-x-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>Super Admin</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>Finance Admin</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>Support Admin</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>Restaurant Manager</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
