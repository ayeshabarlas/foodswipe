'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar, FaEdit, FaCamera, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

interface MyProfileProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export default function MyProfile({ isOpen, onClose, user }: MyProfileProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState<any>(user);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setEditedUser(user);
        }
    }, [user]);

    if (!user) return null;

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const uploadRes = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const imageUrl = `${API_BASE_URL}${uploadRes.data}`;

            // Immediately update profile with new image
            const token = localStorage.getItem('token');
            const updateRes = await axios.put(
                `${API_BASE_URL}/api/auth/profile`,
                { ...editedUser, avatar: imageUrl },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            localStorage.setItem('userInfo', JSON.stringify(updateRes.data));
            setEditedUser(updateRes.data);
            // Force reload to reflect changes in other components if needed, or rely on state if lifted
            window.location.reload();
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(
                `${API_BASE_URL}/api/auth/profile`,
                editedUser,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            localStorage.setItem('userInfo', JSON.stringify(res.data));
            setEditedUser(res.data);
            setIsEditing(false);
            alert('Profile updated successfully!');
            window.location.reload(); // Simple way to sync all components
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-orange-500 to-pink-600 p-6 pb-16">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-white text-lg font-semibold tracking-wide">My Profile</h2>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
                                >
                                    <FaTimes size={14} />
                                </button>
                            </div>

                            {/* Avatar */}
                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                                <div className="relative group">
                                    <div className="w-28 h-28 rounded-full bg-white p-1 shadow-xl">
                                        <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {editedUser?.avatar ? (
                                                <img src={editedUser.avatar} alt={editedUser.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <FaUser size={40} className="text-gray-300" />
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="absolute bottom-0 right-0 bg-orange-500 text-white p-2.5 rounded-full shadow-lg hover:bg-orange-600 transition-transform hover:scale-110 disabled:opacity-70"
                                    >
                                        {uploading ? <FaSpinner className="animate-spin" size={14} /> : <FaCamera size={14} />}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Profile Info */}
                        <div className="pt-16 px-6 pb-6 space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800">{editedUser?.name}</h3>
                                <p className="text-sm text-gray-500">{editedUser?.email}</p>
                            </div>

                            <div className="space-y-5">
                                {/* Full Name */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1.5">
                                        <FaUser size={12} />
                                        Full Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editedUser?.name || ''}
                                            onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition text-sm text-gray-900 font-medium"
                                        />
                                    ) : (
                                        <p className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">{editedUser?.name}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1.5">
                                        <FaEnvelope size={12} />
                                        Email
                                    </label>
                                    <p className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">{editedUser?.email}</p>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1.5">
                                        <FaPhone size={12} />
                                        Phone
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            value={editedUser?.phone || ''}
                                            onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition text-sm text-gray-900 font-medium"
                                        />
                                    ) : (
                                        <p className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">{editedUser?.phone || 'Not set'}</p>
                                    )}
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1.5">
                                        <FaMapMarkerAlt size={12} />
                                        Address
                                    </label>
                                    {isEditing ? (
                                        <textarea
                                            value={editedUser?.address || ''}
                                            onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition resize-none text-sm text-gray-900 font-medium"
                                            rows={3}
                                            placeholder="Enter your delivery address..."
                                        />
                                    ) : (
                                        <p className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 leading-relaxed">
                                            {editedUser?.address || 'No address set'}
                                        </p>
                                    )}
                                </div>

                                {/* Member Since */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1.5">
                                        <FaCalendar size={12} />
                                        Member Since
                                    </label>
                                    <p className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        {formatDate(editedUser?.createdAt || user.memberSince)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-50 bg-white sticky bottom-0">
                            {isEditing ? (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        disabled={loading}
                                        className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={loading}
                                        className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition active:scale-95 text-sm disabled:opacity-70 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <FaSpinner className="animate-spin" /> : 'Save Changes'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition active:scale-95 text-sm flex items-center justify-center gap-2"
                                >
                                    <FaEdit size={14} />
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
