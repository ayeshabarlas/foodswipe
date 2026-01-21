'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import toast from 'react-hot-toast';
import { FaSave, FaCog, FaEnvelope, FaBullhorn, FaPercentage, FaShieldAlt, FaMobileAlt, FaTools, FaMoneyBillWave, FaTruck, FaShoppingCart, FaBan, FaKey, FaPhone, FaGlobe } from 'react-icons/fa';

export default function SettingsView() {
    const [settings, setSettings] = useState<any>({
        commission: 10,
        commissionRate: 15,
        taxRate: 8,
        isTaxEnabled: true,
        supportEmail: 'app.foodswipehelp@gmail.com',
        supportPhone: '+920000000000',
        announcement: '',
        deliveryFeeBase: 40,
        deliveryFeePerKm: 20,
        deliveryFeeMax: 200,
        minimumOrderAmount: 0,
        serviceFee: 0,
        isMaintenanceMode: false,
        featureToggles: {
            isOrderingEnabled: true,
            isRiderSignupEnabled: true,
            isRestaurantSignupEnabled: true,
            isGoogleLoginEnabled: true,
            isWalletEnabled: true,
            isChatEnabled: true,
            isReviewsEnabled: true,
            isPromotionsEnabled: true,
            isPhoneVerificationEnabled: true,
        },
        appVersion: {
            currentVersion: '1.0.0',
            minVersion: '1.0.0',
            forceUpdate: false,
            updateUrl: '',
        },
        safepay: {
            environment: 'sandbox',
            apiKey: '',
            v1Secret: '',
            webhookSecret: ''
        }
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
                setSettings(data);
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
                settings,
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            toast.success('Settings updated successfully', { id: toastId });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update settings', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const toggleFeature = (key: string) => {
        setSettings({
            ...settings,
            featureToggles: {
                ...settings.featureToggles,
                [key]: !settings.featureToggles[key]
            }
        });
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <FaCog className="text-orange-500 animate-spin-slow" /> System Settings
                    </h2>
                    <p className="text-gray-500 mt-1 font-medium italic">Configure app-wide parameters and features</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                    <FaSave /> {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Revenue & Fees */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                        <FaMoneyBillWave className="text-green-500" /> Revenue & Delivery Fees
                    </h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Legacy Commission (%)</label>
                                <div className="relative">
                                    <FaPercentage className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="number"
                                        value={settings.commission}
                                        onChange={(e) => setSettings({...settings, commission: Number(e.target.value)})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Admin Commission (%)</label>
                                <div className="relative">
                                    <FaPercentage className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="number"
                                        value={settings.commissionRate}
                                        onChange={(e) => setSettings({...settings, commissionRate: Number(e.target.value)})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Base Delivery Fee (Rs.)</label>
                                <div className="relative">
                                    <FaTruck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="number"
                                        value={settings.deliveryFeeBase}
                                        onChange={(e) => setSettings({...settings, deliveryFeeBase: Number(e.target.value)})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Fee Per KM (Rs.)</label>
                                <div className="relative">
                                    <FaTruck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="number"
                                        value={settings.deliveryFeePerKm}
                                        onChange={(e) => setSettings({...settings, deliveryFeePerKm: Number(e.target.value)})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Max Delivery Fee (Rs.)</label>
                                <div className="relative">
                                    <FaBan className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="number"
                                        value={settings.deliveryFeeMax}
                                        onChange={(e) => setSettings({...settings, deliveryFeeMax: Number(e.target.value)})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Service Fee (Rs.)</label>
                                <div className="relative">
                                    <FaTools className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="number"
                                        value={settings.serviceFee}
                                        onChange={(e) => setSettings({...settings, serviceFee: Number(e.target.value)})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Minimum Order Amount (Rs.)</label>
                            <div className="relative">
                                <FaShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                <input
                                    type="number"
                                    value={settings.minimumOrderAmount}
                                    onChange={(e) => setSettings({...settings, minimumOrderAmount: Number(e.target.value)})}
                                    className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* Tax Configuration */}
                        <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center">
                                        <FaPercentage />
                                    </div>
                                    <div>
                                        <p className="font-bold text-purple-900">Tax Settings</p>
                                        <p className="text-xs text-purple-700">Enable/Disable and set tax percentage</p>
                                    </div>
                                </div>
                                <div 
                                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 cursor-pointer ${settings.isTaxEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}
                                    onClick={() => setSettings({...settings, isTaxEnabled: !settings.isTaxEnabled})}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${settings.isTaxEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                            
                            {settings.isTaxEnabled && (
                                <div className="space-y-2 pt-2 border-t border-purple-100">
                                    <label className="text-xs font-bold text-purple-700 uppercase ml-1">Tax Percentage (%)</label>
                                    <div className="relative">
                                        <FaPercentage className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 text-sm" />
                                        <input
                                            type="number"
                                            value={settings.taxRate}
                                            onChange={(e) => setSettings({...settings, taxRate: Number(e.target.value)})}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-purple-100 rounded-xl outline-none focus:border-purple-500 transition-all font-bold text-purple-900"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* 2. Feature Toggles */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                        <FaTools className="text-purple-500" /> Feature Toggles
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(settings.featureToggles).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group" onClick={() => toggleFeature(key)}>
                                <span className="text-sm font-bold text-gray-700 capitalize group-hover:text-orange-500 transition-colors">
                                    {key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${value ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${value ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* 3. App Version & Maintenance */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                        <FaMobileAlt className="text-blue-500" /> App Version & Maintenance
                    </h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center">
                                    <FaShieldAlt />
                                </div>
                                <div>
                                    <p className="font-bold text-orange-900">Maintenance Mode</p>
                                    <p className="text-xs text-orange-700">Shuts down app for everyone except admins</p>
                                </div>
                            </div>
                            <div className={`w-14 h-7 rounded-full p-1 transition-all duration-300 cursor-pointer ${settings.isMaintenanceMode ? 'bg-orange-600' : 'bg-gray-300'}`} onClick={() => setSettings({...settings, isMaintenanceMode: !settings.isMaintenanceMode})}>
                                <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 transform ${settings.isMaintenanceMode ? 'translate-x-7' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Current Version</label>
                                <input
                                    type="text"
                                    value={settings.appVersion.currentVersion}
                                    onChange={(e) => setSettings({...settings, appVersion: {...settings.appVersion, currentVersion: e.target.value}})}
                                    className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Min Version Required</label>
                                <input
                                    type="text"
                                    value={settings.appVersion.minVersion}
                                    onChange={(e) => setSettings({...settings, appVersion: {...settings.appVersion, minVersion: e.target.value}})}
                                    className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Update URL</label>
                                <div className="relative">
                                    <FaGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="text"
                                        value={settings.appVersion.updateUrl}
                                        onChange={(e) => setSettings({...settings, appVersion: {...settings.appVersion, updateUrl: e.target.value}})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 flex flex-col justify-end">
                                <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all border border-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={settings.appVersion.forceUpdate}
                                        onChange={(e) => setSettings({...settings, appVersion: {...settings.appVersion, forceUpdate: e.target.checked}})}
                                        className="w-5 h-5 rounded accent-orange-500"
                                    />
                                    <span className="text-sm font-bold text-gray-700">Force Update</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4. Support & Communication */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                        <FaEnvelope className="text-red-500" /> Support & Communication
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Support Email</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="email"
                                        value={settings.supportEmail}
                                        onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Support Phone</label>
                                <div className="relative">
                                    <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="text"
                                        value={settings.supportPhone}
                                        onChange={(e) => setSettings({...settings, supportPhone: e.target.value})}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Global Announcement</label>
                            <div className="relative">
                                <FaBullhorn className="absolute left-4 top-4 text-gray-400 text-sm" />
                                <textarea
                                    value={settings.announcement}
                                    onChange={(e) => setSettings({...settings, announcement: e.target.value})}
                                    placeholder="Enter global announcement text..."
                                    className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold min-h-[100px]"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 5. Payment Config (Safepay) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 lg:col-span-2">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                        <FaKey className="text-yellow-500" /> Payment Configuration (Safepay)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Environment</label>
                            <select
                                value={settings.safepay.environment}
                                onChange={(e) => setSettings({...settings, safepay: {...settings.safepay, environment: e.target.value}})}
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                            >
                                <option value="sandbox">Sandbox (Testing)</option>
                                <option value="production">Production (Live)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">API Key</label>
                            <input
                                type="text"
                                value={settings.safepay.apiKey}
                                onChange={(e) => setSettings({...settings, safepay: {...settings.safepay, apiKey: e.target.value}})}
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                                placeholder="Enter Safepay API Key"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">V1 Secret</label>
                            <input
                                type="password"
                                value={settings.safepay.v1Secret}
                                onChange={(e) => setSettings({...settings, safepay: {...settings.safepay, v1Secret: e.target.value}})}
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                                placeholder="Enter V1 Secret"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Webhook Secret</label>
                            <input
                                type="password"
                                value={settings.safepay.webhookSecret}
                                onChange={(e) => setSettings({...settings, safepay: {...settings.safepay, webhookSecret: e.target.value}})}
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                                placeholder="Enter Webhook Secret"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
