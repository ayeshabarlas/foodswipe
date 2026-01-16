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
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const { data } = await axios.get(`${API_BASE_URL}/api/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data) {
                setCommission(data.commission || 10);
                setSupportEmail(data.supportEmail || 'app.foodswipehelp@gmail.com');
                setAnnouncement(data.announcement || '');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const toastId = toast.loading('Saving settings...');
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(
                `${API_BASE_URL}/api/admin/settings`,
                { commission, supportEmail, announcement },
                { headers: { Authorization: `Bearer ${token}` } }
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
            <div className="mb-8">
                <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Platform Settings</h2>
                <p className="text-[14px] font-normal text-[#6B7280] mt-1">Configure platform behavior and defaults</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-[#FF6A00] shadow-sm group-hover:scale-110 transition-transform">
                                <FaCog className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-bold text-[#111827] tracking-tight">General Configuration</h3>
                                <p className="text-[13px] text-[#6B7280]">Basic platform parameters</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                <FaPercentage className="text-[#FF6A00]" /> Commission Percentage
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={commission}
                                    onChange={(e) => setCommission(Number(e.target.value))}
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[15px] font-bold text-[#111827] transition-all"
                                    min="0"
                                    max="100"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-bold">%</span>
                            </div>
                            <p className="text-[12px] text-[#9CA3AF] mt-1 italic ml-1">
                                This percentage is deducted from every successful order.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                <FaEnvelope className="text-blue-500" /> Support Email Address
                            </label>
                            <input
                                type="email"
                                value={supportEmail}
                                onChange={(e) => setSupportEmail(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[15px] font-medium text-[#111827] transition-all"
                            />
                            <p className="text-[12px] text-[#9CA3AF] mt-1 italic ml-1">
                                Official contact email for restaurants and customers.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 shadow-sm group-hover:scale-110 transition-transform">
                                <FaBullhorn className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-bold text-[#111827] tracking-tight">Global Announcements</h3>
                                <p className="text-[13px] text-[#6B7280]">Broadcast messages to users</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="space-y-3">
                            <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                                Banner Message
                            </label>
                            <textarea
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/10 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] min-h-[150px] transition-all resize-none"
                                placeholder="Enter announcement message..."
                            />
                            <div className="mt-6 p-6 bg-orange-50/50 border border-orange-100 rounded-[1.5rem] relative overflow-hidden">
                                <p className="text-[11px] font-bold text-[#FF6A00] uppercase tracking-widest mb-2 relative z-10">Live Preview</p>
                                <p className="text-[14px] text-[#111827] font-medium relative z-10 leading-relaxed">{announcement || 'No announcement set'}</p>
                                <FaBullhorn className="absolute -bottom-4 -right-4 text-6xl text-orange-200/20 rotate-12" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 px-10 py-4 bg-[#FF6A00] text-white rounded-2xl font-bold hover:bg-[#e65f00] shadow-lg shadow-[#FF6A00]/20 transition-all duration-300 disabled:opacity-50 uppercase text-[13px] tracking-widest"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            Saving Changes...
                        </>
                    ) : (
                        <>
                            <FaSave className="text-base" /> Save Settings
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
