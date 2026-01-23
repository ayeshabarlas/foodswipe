'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPowerOff, FaClock, FaInfoCircle, FaBell, FaCheckCircle, FaChartLine } from 'react-icons/fa';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
import { getImageUrl, getImageFallback } from '../utils/imageUtils';

interface StoreHours {
    day: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
}

interface DashboardStoreProps {
    restaurant: any;
    onUpdate: () => void;
}

export default function DashboardStore({ restaurant, onUpdate }: DashboardStoreProps) {
    const [storeStatus, setStoreStatus] = useState<'open' | 'closed' | 'busy'>('open');
    const [prepTime, setPrepTime] = useState(20);
    const [logo, setLogo] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [storeHours, setStoreHours] = useState<StoreHours[]>([
        { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
        { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
        { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
        { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
        { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
        { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
        { day: 'Sunday', isOpen: false, openTime: '09:00', closeTime: '22:00' },
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (restaurant) {
            setStoreStatus(restaurant.storeStatus || 'open');
            setPrepTime(restaurant.prepTime || 20);
            setLogo(restaurant.logo || '');
            if (restaurant.storeHours && restaurant.storeHours.length > 0) {
                setStoreHours(restaurant.storeHours);
            }
        }
    }, [restaurant]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (5MB max for logos)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            alert('File size must be less than 5MB. Please choose a smaller image.');
            e.target.value = ''; // Reset input
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG, etc.)');
            e.target.value = '';
            return;
        }

        const uploadData = new FormData();
        uploadData.append('file', file);

        setUploadingLogo(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            };

            const { data } = await axios.post(`${getApiUrl()}/api/upload`, uploadData, config);
            const fullUrl = data.imageUrl;
            setLogo(fullUrl);

            // Immediately update restaurant profile with new logo
            await axios.put(
                `${getApiUrl()}/api/restaurants/store-settings`,
                { logo: fullUrl },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            onUpdate(); // Refresh parent
            alert('Logo updated successfully!');
        } catch (error) {
            console.error('Logo upload error:', error);
            alert('Failed to upload logo. Please try again.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(
                `${getApiUrl()}/api/restaurants/store-settings`,
                { storeStatus, prepTime, storeHours },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onUpdate();
            alert('Store settings updated successfully!');
        } catch (error: any) {
            console.error('Error saving store settings:', error);
            alert(error.response?.data?.message || 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const toggleBusyMode = () => {
        setStoreStatus(storeStatus === 'busy' ? 'open' : 'busy');
    };

    const handlePrepTimeUpdate = async () => {
        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(
                `${getApiUrl()}/api/restaurants/prep-time`,
                { prepTime },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onUpdate();
            alert('Preparation time updated!');
        } catch (error) {
            console.error('Error updating prep time:', error);
            alert('Failed to update preparation time');
        } finally {
            setLoading(false);
        }
    };

    const toggleDayOpen = (index: number) => {
        const updated = [...storeHours];
        updated[index].isOpen = !updated[index].isOpen;
        setStoreHours(updated);
    };

    const updateDayTime = (index: number, field: 'openTime' | 'closeTime', value: string) => {
        const updated = [...storeHours];
        updated[index][field] = value;
        setStoreHours(updated);
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl">
            {/* Store Branding */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6"
            >
                <div className="relative group w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                    {logo ? (
                        <img 
                            src={getImageUrl(logo)} 
                            alt="Store Logo" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = getImageFallback('logo');
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] text-center p-2">
                            No Logo
                        </div>
                    )}
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white text-xs font-bold">
                        {uploadingLogo ? 'Uploading...' : 'Change Logo'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Store Branding</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Upload your restaurant logo. Recommended: 500x500px. Max: 5MB.
                    </p>
                </div>
            </motion.div>

            {/* Store Status Banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-6 ${storeStatus === 'open'
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : storeStatus === 'busy'
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                        : 'bg-gradient-to-r from-gray-500 to-gray-600'
                    }`}
            >
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <FaPowerOff className="text-2xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">
                                Store is {storeStatus === 'open' ? 'Open' : storeStatus === 'busy' ? 'Busy' : 'Closed'}
                            </h2>
                            <p className="text-white/90 text-sm">
                                {storeStatus === 'open' && 'Accepting orders normally'}
                                {storeStatus === 'busy' && 'Slower response time - high order volume'}
                                {storeStatus === 'closed' && 'Not accepting new orders'}
                            </p>
                        </div>
                    </div>
                    {storeStatus !== 'closed' && (
                        <button
                            onClick={toggleBusyMode}
                            className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-xl font-semibold transition"
                        >
                            Turn {storeStatus === 'busy' ? 'Off' : 'On'} Busy Mode
                        </button>
                    )}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Store Hours */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Store Hours</h3>
                    <div className="space-y-3">
                        {storeHours.map((day, index) => (
                            <div
                                key={day.day}
                                className={`p-4 rounded-xl border-2 transition ${day.isOpen ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50'
                                    }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${day.isOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        <span className="font-medium text-gray-900 w-24">{day.day}</span>

                                        {day.isOpen ? (
                                            <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
                                                <input
                                                    type="time"
                                                    value={day.openTime}
                                                    onChange={(e) => updateDayTime(index, 'openTime', e.target.value)}
                                                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-full sm:w-auto"
                                                />
                                                <span className="text-gray-400 hidden sm:inline">-</span>
                                                <input
                                                    type="time"
                                                    value={day.closeTime}
                                                    onChange={(e) => updateDayTime(index, 'closeTime', e.target.value)}
                                                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-full sm:w-auto"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Closed</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => toggleDayOpen(index)}
                                        className={`w-full sm:w-auto px-4 py-1.5 rounded-lg text-sm font-medium transition ${day.isOpen
                                            ? 'text-red-600 hover:bg-red-50 border border-red-100'
                                            : 'text-green-600 hover:bg-green-50 border border-green-100'
                                            }`}
                                    >
                                        {day.isOpen ? 'Close' : 'Open'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSaveChanges}
                        disabled={loading}
                        className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-xl transition disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </motion.div>

                {/* Estimated Preparation Time */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Estimated Preparation Time</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Set the default time needed to prepare orders. This will be shown to customers.
                    </p>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-gray-600">Current prep time</span>
                            <span className="text-3xl font-bold text-gray-900">{prepTime} mins</span>
                        </div>

                        {/* Slider */}
                        <input
                            type="range"
                            min="10"
                            max="60"
                            step="5"
                            value={prepTime}
                            onChange={(e) => setPrepTime(parseInt(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                                background: `linear-gradient(to right, #fb923c 0%, #fb923c ${((prepTime - 10) / 50) * 100}%, #e5e7eb ${((prepTime - 10) / 50) * 100}%, #e5e7eb 100%)`
                            }}
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span>10 mins</span>
                            <span>35 mins</span>
                            <span>60 mins</span>
                        </div>
                    </div>

                    {/* Auto-adjust Info */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <FaInfoCircle className="text-blue-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-900">Auto-adjust enabled</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Prep time automatically adjusts based on current kitchen load and order volume.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePrepTimeUpdate}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-lg text-white font-bold py-4 rounded-xl transition disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Update Prep Time'}
                    </button>
                </motion.div>
            </div>

            {/* Additional Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Auto-Accept */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <FaClock className="text-purple-600 text-xl" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Auto-Accept</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Automatically accept orders during low-traffic hours
                    </p>
                    <button className="text-purple-600 font-semibold text-sm hover:underline">
                        Configure
                    </button>
                </motion.div>

                {/* Order Limit */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <FaCheckCircle className="text-green-600 text-xl" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Order Limit</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Maximum concurrent orders your kitchen can handle
                    </p>
                    <button className="text-green-600 font-semibold text-sm hover:underline">
                        Set Limit
                    </button>
                </motion.div>

                {/* Notifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                        <FaBell className="text-orange-600 text-xl" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Notifications</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Manage alert sounds and notification preferences
                    </p>
                    <button className="text-orange-600 font-semibold text-sm hover:underline">
                        Manage
                    </button>
                </motion.div>
            </div>
        </div>
    );
}

