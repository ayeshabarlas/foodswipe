'use client';

import React, { useState, useEffect } from 'react';
import { FaSave, FaPlus, FaTrash, FaClock, FaMapMarkerAlt, FaInfoCircle, FaUniversity, FaCamera, FaCheck } from 'react-icons/fa';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
import { getImageUrl } from '../utils/imageUtils';
import ModernLoader from './ModernLoader';

interface SettingsTabProps {
    restaurant: any;
    onUpdate: () => void;
}

export default function SettingsTab({ restaurant, onUpdate }: SettingsTabProps) {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contact: '',
        description: '',
        cuisineTypes: [] as string[],
        priceRange: 'RsRs',
        deliveryTime: '',
        openingHours: {
            monday: { open: '09:00', close: '22:00', isClosed: false },
            tuesday: { open: '09:00', close: '22:00', isClosed: false },
            wednesday: { open: '09:00', close: '22:00', isClosed: false },
            thursday: { open: '09:00', close: '22:00', isClosed: false },
            friday: { open: '09:00', close: '23:00', isClosed: false },
            saturday: { open: '10:00', close: '23:00', isClosed: false },
            sunday: { open: '10:00', close: '22:00', isClosed: false },
        },
        logo: '',
        location: {
            type: 'Point',
            coordinates: [0, 0]
        },
        bankDetails: {
            accountType: 'bank',
            accountHolderName: '',
            accountNumber: '',
            bankName: '',
            branchCode: '',
            iban: '',
            phoneNumber: '',
        },
        deliveryZones: [] as any[]
    });
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    useEffect(() => {
        if (restaurant) {
            const defaultHours = { open: '09:00', close: '22:00', isClosed: false };
            setFormData({
                name: restaurant.name || '',
                address: restaurant.address || '',
                contact: restaurant.contact || '',
                description: restaurant.description || '',
                cuisineTypes: restaurant.cuisineTypes || [],
                priceRange: restaurant.priceRange || 'RsRs',
                deliveryTime: restaurant.deliveryTime || '',
                openingHours: {
                    monday: restaurant.openingHours?.monday || { ...defaultHours },
                    tuesday: restaurant.openingHours?.tuesday || { ...defaultHours },
                    wednesday: restaurant.openingHours?.wednesday || { ...defaultHours },
                    thursday: restaurant.openingHours?.thursday || { ...defaultHours },
                    friday: restaurant.openingHours?.friday || { ...defaultHours },
                    saturday: restaurant.openingHours?.saturday || { ...defaultHours },
                    sunday: restaurant.openingHours?.sunday || { ...defaultHours },
                },
                deliveryZones: restaurant.deliveryZones || [],
                logo: restaurant.logo || '',
                location: restaurant.location || { type: 'Point', coordinates: [0, 0] },
                bankDetails: {
                    accountType: restaurant.bankDetails?.accountType || 'bank',
                    accountHolderName: restaurant.bankDetails?.accountHolderName || '',
                    accountNumber: restaurant.bankDetails?.accountNumber || '',
                    bankName: restaurant.bankDetails?.bankName || '',
                    branchCode: restaurant.bankDetails?.branchCode || '',
                    iban: restaurant.bankDetails?.iban || '',
                    phoneNumber: restaurant.bankDetails?.phoneNumber || '',
                }
            });
        }
    }, [restaurant]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        setUploadingLogo(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            const { data } = await axios.post(`${getApiUrl()}/api/upload`, uploadData, config);
            const fullUrl = data.imageUrl; // Use direct URL from response
            
            // Immediately update backend to sync with Store Profile
            await axios.put(
                `${getApiUrl()}/api/restaurants/store-settings`,
                { logo: fullUrl },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );

            setFormData(prev => ({ ...prev, logo: fullUrl }));
            onUpdate(); // Refresh parent to sync sidebar/other tabs
            alert('Logo uploaded and synced successfully!');
        } catch (error: any) {
            console.error('Logo upload error:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to upload logo';
            alert(`Upload Error: ${msg}`);
        } finally {
            setUploadingLogo(false);
        }
    };

    const [saved, setSaved] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            
            // Force re-geocoding by omitting location from updateData.
            // This ensures that the backend refreshes the coordinates from the address
            // whenever the user saves their settings, fixing any previous geocoding errors.
            const updateData = { ...formData };
            delete updateData.location;

            // We send the filtered updateData. The backend will handle geocoding 
            // the address into coordinates if the address has changed or location is missing.
            await axios.put(`${getApiUrl()}/api/restaurants/${restaurant._id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onUpdate();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || error.message || 'Failed to save settings';
            alert(`Error: ${message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleZoneChange = (index: number, field: string, value: any) => {
        const newZones = [...formData.deliveryZones];
        newZones[index] = { ...newZones[index], [field]: value };
        setFormData({ ...formData, deliveryZones: newZones });
    };

    const addZone = () => {
        setFormData({
            ...formData,
            deliveryZones: [...formData.deliveryZones, { name: '', radius: 5, deliveryFee: 50, minOrder: 0 }]
        });
    };

    const removeZone = (index: number) => {
        const newZones = [...formData.deliveryZones];
        newZones.splice(index, 1);
        setFormData({ ...formData, deliveryZones: newZones });
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Restaurant Settings</h2>
                    <p className="text-sm text-gray-500">Manage your restaurant profile and preferences</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition disabled:opacity-50 shadow-lg ${saved ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-primary text-white hover:bg-primary-dark shadow-primary/20'}`}
                >
                    {saved ? (
                        <>
                            <FaCheck /> Saved Changes
                        </>
                    ) : (
                        <>
                            <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                        </>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FaCamera className="text-primary" />
                        Restaurant Logo
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative group w-32 h-32 shrink-0">
                            {formData.logo ? (
                                <>
                                    <img
                                        src={getImageUrl(formData.logo)}
                                        alt="Logo"
                                        className="w-full h-full rounded-2xl object-cover border-2 border-gray-100 shadow-md"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, logo: '' })}
                                        className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"
                                    >
                                        <FaTrash className="text-white text-xl" />
                                    </button>
                                </>
                            ) : (
                                <div className="w-full h-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                                    <FaCamera size={24} className="mb-2" />
                                    <span className="text-xs">Upload Logo</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-600 mb-2">Upload New Logo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2.5 file:px-4
                                    file:rounded-xl file:border-0
                                    file:text-sm file:font-bold
                                    file:bg-primary/10 file:text-primary
                                    hover:file:bg-primary/20
                                    cursor-pointer bg-gray-50 rounded-xl border border-gray-100"
                            />
                            <p className="text-xs text-gray-400 mt-2">Recommended: 500x500px. Max: 5MB.</p>
                            {uploadingLogo && (
                                <div className="flex items-center gap-2 text-primary mt-2">
                                    <ModernLoader size="sm" />
                                    <span className="text-sm font-medium">Uploading...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* General Info */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FaInfoCircle className="text-primary" />
                        General Information
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1.5 font-medium">Restaurant Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1.5 font-medium">Contact Number</label>
                                <input
                                    type="text"
                                    value={formData.contact}
                                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                    className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1.5 font-medium">Price Range</label>
                                <select
                                    value={formData.priceRange}
                                    onChange={e => setFormData({ ...formData, priceRange: e.target.value })}
                                    className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all"
                                >
                                    <option value="Rs">Rs (Budget)</option>
                                    <option value="RsRs">RsRs (Moderate)</option>
                                    <option value="RsRsRs">RsRsRs (Expensive)</option>
                                    <option value="RsRsRsRs">RsRsRsRs (Luxury)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1.5 font-medium">Cuisine Types</label>
                                <input
                                    type="text"
                                    value={formData.cuisineTypes.join(', ')}
                                    onChange={e => setFormData({ ...formData, cuisineTypes: e.target.value.split(',').map(s => s.trim()) })}
                                    className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all"
                                    placeholder="e.g. Italian, Fast Food"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1.5 font-medium">Delivery Time</label>
                                <input
                                    type="text"
                                    value={formData.deliveryTime || ''}
                                    onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                                    className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all"
                                    placeholder="e.g. 30-45 min"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1.5 font-medium">Address</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1.5 font-medium">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all h-24 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Bank Details */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FaUniversity className="text-primary" />
                        Bank Account Details
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1.5 font-medium">Account Type</label>
                            <select
                                value={formData.bankDetails.accountType}
                                onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountType: e.target.value } })}
                                className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all"
                            >
                                <option value="bank">Bank Account</option>
                                <option value="jazzcash">JazzCash</option>
                                <option value="easypaisa">EasyPaisa</option>
                            </select>
                        </div>

                        {formData.bankDetails.accountType === 'bank' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1.5 font-medium">Bank Name</label>
                                    <input type="text" value={formData.bankDetails.bankName} onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })} className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all" placeholder="e.g. HBL" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1.5 font-medium">Branch Code</label>
                                    <input type="text" value={formData.bankDetails.branchCode} onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, branchCode: e.target.value } })} className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all" placeholder="e.g. 0123" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1.5 font-medium">Account Title</label>
                                    <input type="text" value={formData.bankDetails.accountHolderName} onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountHolderName: e.target.value } })} className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all" placeholder="Account Holder Name" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1.5 font-medium">Account Number</label>
                                    <input type="text" value={formData.bankDetails.accountNumber} onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })} className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all" placeholder="Account Number" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm text-gray-600 mb-1.5 font-medium">IBAN</label>
                                    <input type="text" value={formData.bankDetails.iban} onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, iban: e.target.value } })} className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all" placeholder="PK..." />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1.5 font-medium">Account Title</label>
                                    <input type="text" value={formData.bankDetails.accountHolderName} onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountHolderName: e.target.value } })} className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all" placeholder="Account Holder Name" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1.5 font-medium">Mobile Number</label>
                                    <input type="text" value={formData.bankDetails.phoneNumber} onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, phoneNumber: e.target.value } })} className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-gray-200 transition-all" placeholder="03..." />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Operating Hours */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FaClock className="text-primary" />
                        Operating Hours
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {days.map(day => (
                            <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <div className="flex items-center justify-between sm:w-32">
                                    <div className="capitalize font-medium text-gray-700">{day}</div>
                                    <label className="flex items-center gap-2 cursor-pointer sm:hidden">
                                        <input
                                            type="checkbox"
                                            checked={formData.openingHours[day as keyof typeof formData.openingHours].isClosed}
                                            onChange={e => setFormData({
                                                ...formData,
                                                openingHours: {
                                                    ...formData.openingHours,
                                                    [day]: { ...formData.openingHours[day as keyof typeof formData.openingHours], isClosed: e.target.checked }
                                                }
                                            })}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary bg-white border-gray-300"
                                        />
                                        <span className="text-xs text-gray-500">Closed</span>
                                    </label>
                                </div>

                                <div className="flex-1 flex items-center gap-2 sm:gap-4">
                                    <label className="hidden sm:flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.openingHours[day as keyof typeof formData.openingHours].isClosed}
                                            onChange={e => setFormData({
                                                ...formData,
                                                openingHours: {
                                                    ...formData.openingHours,
                                                    [day]: { ...formData.openingHours[day as keyof typeof formData.openingHours], isClosed: e.target.checked }
                                                }
                                            })}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary bg-white border-gray-300"
                                        />
                                        <span className="text-xs sm:text-sm text-gray-500">Closed</span>
                                    </label>
                                    {!formData.openingHours[day as keyof typeof formData.openingHours].isClosed && (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="time"
                                                value={formData.openingHours[day as keyof typeof formData.openingHours].open}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    openingHours: {
                                                        ...formData.openingHours,
                                                        [day]: { ...formData.openingHours[day as keyof typeof formData.openingHours], open: e.target.value }
                                                    }
                                                })}
                                                className="bg-white text-gray-900 text-xs sm:text-sm rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary w-full border border-gray-200"
                                            />
                                            <span className="text-gray-400">-</span>
                                            <input
                                                type="time"
                                                value={formData.openingHours[day as keyof typeof formData.openingHours].close}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    openingHours: {
                                                        ...formData.openingHours,
                                                        [day]: { ...formData.openingHours[day as keyof typeof formData.openingHours], close: e.target.value }
                                                    }
                                                })}
                                                className="bg-white text-gray-900 text-xs sm:text-sm rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary w-full border border-gray-200"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Delivery Zones */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-primary" />
                            Delivery Zones
                        </h3>
                        <button
                            type="button"
                            onClick={addZone}
                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium flex items-center gap-1 transition"
                        >
                            <FaPlus size={12} /> Add Zone
                        </button>
                    </div>
                    {formData.deliveryZones.length === 0 ? (
                        <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            No delivery zones configured
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {formData.deliveryZones.map((zone, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4 items-end">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs text-gray-500 mb-1 font-medium">Zone Name</label>
                                        <input
                                            type="text"
                                            value={zone.name}
                                            onChange={e => handleZoneChange(idx, 'name', e.target.value)}
                                            className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary border border-gray-200"
                                            placeholder="e.g. Downtown"
                                            required
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs text-gray-500 mb-1 font-medium">Radius (km)</label>
                                        <input
                                            type="number"
                                            value={zone.radius}
                                            onChange={e => handleZoneChange(idx, 'radius', parseFloat(e.target.value))}
                                            className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary border border-gray-200"
                                            required
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs text-gray-500 mb-1 font-medium">Fee (Rs.)</label>
                                        <input
                                            type="number"
                                            value={zone.deliveryFee}
                                            onChange={e => handleZoneChange(idx, 'deliveryFee', parseFloat(e.target.value))}
                                            className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary border border-gray-200"
                                            required
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs text-gray-500 mb-1 font-medium">Min Order</label>
                                        <input
                                            type="number"
                                            value={zone.minOrder}
                                            onChange={e => handleZoneChange(idx, 'minOrder', parseFloat(e.target.value))}
                                            className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary border border-gray-200"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeZone(idx)}
                                        className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition mb-[1px]"
                                    >
                                        <FaTrash size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

