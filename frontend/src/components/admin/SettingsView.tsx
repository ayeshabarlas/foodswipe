'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';

import toast from 'react-hot-toast';
import { FaSave, FaCog, FaEnvelope, FaBullhorn, FaPercentage } from 'react-icons/fa';

export default function SettingsView() {
    const [commission, setCommission] = useState(10);
    const [supportEmail, setSupportEmail] = useState('app.foodswipehelp@gmail.com');
    const [announcement, setAnnouncement] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;

            const { data } = await axios.get(`${API_BASE_URL}/api/admin/settings`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            if (data) {
                setCommission(data.commission || 10);
                setSupportEmail(data.supportEmail || 'app.foodswipehelp@gmail.com');
                setAnnouncement(data.announcement || '');
            }
        } catch (error: any) {
            console.error('Error fetching settings:', error);
            if (error.response?.status !== 401) {
                toast.error('Failed to load settings');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const toastId = toast.loading('Saving settings...');
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) {
                toast.error('Session expired', { id: toastId });
                return;
            }

            await axios.put(
                `${API_BASE_URL}/api/admin/settings`,
                { commission, supportEmail, announcement },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            toast.success('Settings updated successfully!', { id: toastId });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-10">
                <h2 className="text-[32px] font-bold text-[#111827] tracking-tight">Platform Settings</h2>
                <p className="text-[16px] font-medium text-[#6B7280] mt-2">Configure platform behavior and defaults</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                    <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-500">
                                <FaCog className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">General Configuration</h3>
                                <p className="text-[14px] text-[#6B7280] font-medium">Basic platform parameters</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-10">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.2em] ml-1">
                                <FaPercentage className="text-orange-500" /> Commission Percentage
                            </label>
                            <div className="relative group/input">
                                <input
                                    type="number"
                                    value={commission}
                                    onChange={(e) => setCommission(Number(e.target.value))}
                                    className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none text-[18px] font-bold text-[#111827] transition-all"
                                    min="0"
                                    max="100"
                                />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-bold text-lg">%</span>
                            </div>
                            <p className="text-[13px] text-[#9CA3AF] mt-2 font-medium ml-1 flex items-center gap-2">
                                <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                                This percentage is deducted from every successful order.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.2em] ml-1">
                                <FaEnvelope className="text-blue-500" /> Support Email Address
                            </label>
                            <input
                                type="email"
                                value={supportEmail}
                                onChange={(e) => setSupportEmail(e.target.value)}
                                className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none text-[16px] font-bold text-[#111827] transition-all"
                            />
                            <p className="text-[13px] text-[#9CA3AF] mt-2 font-medium ml-1 flex items-center gap-2">
                                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                Official contact email for restaurants and customers.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                    <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-500">
                                <FaBullhorn className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">Global Announcements</h3>
                                <p className="text-[14px] text-[#6B7280] font-medium">Broadcast messages to users</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-10">
                        <div className="space-y-4">
                            <label className="block text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.2em] ml-1">
                                Banner Message
                            </label>
                            <textarea
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none text-[15px] font-medium text-[#111827] min-h-[180px] transition-all resize-none leading-relaxed"
                                placeholder="Enter announcement message..."
                            />
                            <div className="mt-8 p-8 bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-100 rounded-[2rem] relative overflow-hidden group/preview">
                                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-orange-200/20 rounded-full blur-2xl group-hover/preview:scale-150 transition-transform duration-700"></div>
                                <p className="text-[12px] font-bold text-orange-600 uppercase tracking-widest mb-3 relative z-10 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                    Live Preview
                                </p>
                                <p className="text-[15px] text-[#111827] font-bold relative z-10 leading-relaxed italic">"{announcement || 'No announcement set'}"</p>
                                <FaBullhorn className="absolute bottom-4 right-4 text-6xl text-orange-200/20 rotate-12 group-hover/preview:rotate-0 transition-transform duration-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-4 px-12 py-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300 disabled:opacity-50 uppercase text-[14px] tracking-[0.2em] shadow-lg active:scale-95"
                >
                    {saving ? (
                        <>
                            <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <FaSave className="text-lg" /> Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
