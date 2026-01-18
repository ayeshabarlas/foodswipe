'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/config';
import { FaLock, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function SetupPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('form');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            toast.error('Invalid or missing invitation token');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (password.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/admin/accept-invite`, {
                token,
                password
            });
            setStatus('success');
            toast.success('Account setup successful!');
            setTimeout(() => {
                router.push('/foodswipe-portal/login');
            }, 3000);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to setup account');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaShieldAlt className="text-3xl text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
                    <p className="text-gray-400 mb-8">This invitation link is invalid or has expired. Please contact your administrator for a new invite.</p>
                    <button 
                        onClick={() => router.push('/')}
                        className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-xl p-12 rounded-[3rem] border border-white/10 text-center max-w-md w-full">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                        <FaCheckCircle className="text-4xl text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">Setup Complete!</h1>
                    <p className="text-gray-400 mb-8 leading-relaxed">Your administrator account is now active. Redirecting you to login...</p>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full animate-progress-fast"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-500/10 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2"></div>

            <div className="bg-white/5 backdrop-blur-2xl p-8 md:p-12 rounded-[3rem] border border-white/10 max-w-md w-full relative z-10">
                <div className="mb-10 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12 shadow-2xl shadow-orange-500/20">
                        <FaLock className="text-3xl text-white -rotate-12" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Setup Account</h1>
                    <p className="text-gray-400 mt-2 font-medium">Choose a secure password for your admin account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                        <div className="relative group">
                            <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-white font-medium"
                                placeholder="Min. 6 characters"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                        <div className="relative group">
                            <FaCheckCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                required
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-white font-medium"
                                placeholder="Repeat password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-orange-500/40 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 uppercase tracking-widest text-sm shadow-xl"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Activating...</span>
                            </div>
                        ) : 'Activate Account'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-xs">
                        By activating, you agree to follow the system security protocols.
                    </p>
                </div>
            </div>
        </div>
    );
}
