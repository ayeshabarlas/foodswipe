'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';

import toast from 'react-hot-toast';
import { FaSave, FaCog, FaEnvelope, FaBullhorn, FaPercentage, FaShieldAlt, FaMobileAlt, FaTools, FaMoneyBillWave, FaTruck, FaShoppingCart } from 'react-icons/fa';

export default function SettingsView() {
    const [commission, setCommission] = useState(10);
    const [supportEmail, setSupportEmail] = useState('app.foodswipehelp@gmail.com');
    const [announcement, setAnnouncement] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [serviceFee, setServiceFee] = useState(0);
    const [minimumOrderAmount, setMinimumOrderAmount] = useState(0);
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    
    const [featureToggles, setFeatureToggles] = useState({
        isWalletEnabled: true,
        isChatEnabled: true,
        isReviewsEnabled: true,
        isPromotionsEnabled: true,
    });

    const [appConfig, setAppConfig] = useState({
        currentVersion: '1.0.0',
        minVersion: '1.0.0',
        forceUpdate: false,
        androidLink: '',
        iosLink: '',
    });

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
                setDeliveryFee(data.deliveryFee || 0);
                setServiceFee(data.serviceFee || 0);
                setMinimumOrderAmount(data.minimumOrderAmount || 0);
                setIsMaintenanceMode(data.isMaintenanceMode || false);
                if (data.featureToggles) setFeatureToggles(data.featureToggles);
                if (data.appConfig) setAppConfig(data.appConfig);
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
                { 
                    commission, 
                    supportEmail, 
                    announcement,
                    deliveryFee,
                    serviceFee,
                    minimumOrderAmount,
                    isMaintenanceMode,
                    featureToggles,
                    appConfig
                },
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

                {/* Fees & Limits */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                    <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform duration-500">
                                <FaMoneyBillWave className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">Fees & Limits</h3>
                                <p className="text-[14px] text-[#6B7280] font-medium">Manage delivery and service costs</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.2em] ml-1">
                                    <FaTruck className="text-green-500" /> Delivery Fee
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={deliveryFee}
                                        onChange={(e) => setDeliveryFee(Number(e.target.value))}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none text-[16px] font-bold text-[#111827] transition-all"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-bold">Rs</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.2em] ml-1">
                                    <FaCog className="text-blue-500" /> Service Fee
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={serviceFee}
                                        onChange={(e) => setServiceFee(Number(e.target.value))}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none text-[16px] font-bold text-[#111827] transition-all"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-bold">Rs</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.2em] ml-1">
                                <FaShoppingCart className="text-orange-500" /> Min Order Amount
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={minimumOrderAmount}
                                    onChange={(e) => setMinimumOrderAmount(Number(e.target.value))}
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none text-[16px] font-bold text-[#111827] transition-all"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-bold">Rs</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature Toggles */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                    <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                                <FaShieldAlt className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">Feature Toggles</h3>
                                <p className="text-[14px] text-[#6B7280] font-medium">Enable or disable app features</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-6">
                        {Object.entries(featureToggles).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <span className="text-[14px] font-bold text-[#374151] capitalize">
                                    {key.replace('is', '').replace('Enabled', '')} System
                                </span>
                                <button
                                    onClick={() => setFeatureToggles(prev => ({ ...prev, [key]: !value }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                        value ? 'bg-orange-500' : 'bg-gray-300'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            value ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* App Configuration */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                    <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform duration-500">
                                <FaMobileAlt className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">App Configuration</h3>
                                <p className="text-[14px] text-[#6B7280] font-medium">Manage versions and updates</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">Current Version</label>
                                <input
                                    type="text"
                                    value={appConfig.currentVersion}
                                    onChange={(e) => setAppConfig(prev => ({ ...prev, currentVersion: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">Min Version</label>
                                <input
                                    type="text"
                                    value={appConfig.minVersion}
                                    onChange={(e) => setAppConfig(prev => ({ ...prev, minVersion: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
                            <div>
                                <span className="text-[14px] font-bold text-[#374151]">Force Update</span>
                                <p className="text-[12px] text-orange-600 font-medium">Require users to update</p>
                            </div>
                            <button
                                onClick={() => setAppConfig(prev => ({ ...prev, forceUpdate: !prev.forceUpdate }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                    appConfig.forceUpdate ? 'bg-orange-500' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        appConfig.forceUpdate ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">Android Link</label>
                                <input
                                    type="text"
                                    value={appConfig.androidLink}
                                    onChange={(e) => setAppConfig(prev => ({ ...prev, androidLink: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-orange-500"
                                    placeholder="Play Store URL"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">iOS Link</label>
                                <input
                                    type="text"
                                    value={appConfig.iosLink}
                                    onChange={(e) => setAppConfig(prev => ({ ...prev, iosLink: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-orange-500"
                                    placeholder="App Store URL"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maintenance Mode */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                    <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform duration-500">
                                <FaTools className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">Maintenance Mode</h3>
                                <p className="text-[14px] text-[#6B7280] font-medium">Temporarily disable public access</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10">
                        <div className="flex items-center justify-between p-6 bg-red-50 rounded-2xl border border-red-100">
                            <div className="space-y-1">
                                <span className="text-[16px] font-bold text-red-900">Maintenance Status</span>
                                <p className="text-[13px] text-red-600 font-medium">When active, users will see a maintenance screen</p>
                            </div>
                            <button
                                onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                                    isMaintenanceMode ? 'bg-red-500' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                        isMaintenanceMode ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                />
                            </button>
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
