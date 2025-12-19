'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaStar, FaCheckCircle, FaUser, FaPhone, FaEnvelope, FaBicycle, FaMapMarkerAlt, FaBell, FaCog, FaSignOutAlt, FaChevronRight, FaTimes } from 'react-icons/fa';

interface RiderProfileProps {
    riderId: string;
}

export default function RiderProfile({ riderId }: RiderProfileProps) {
    const [riderData, setRiderData] = useState<any>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRiderData = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRiderData(res.data);
                setError(null);
            } catch (error) {
                console.error('Error fetching rider data:', error);
                setError('Failed to load profile');
            }
        };

        fetchRiderData();

        // Real-time updates every 10 seconds
        const interval = setInterval(fetchRiderData, 10000);
        return () => clearInterval(interval);
    }, [riderId]);

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        window.location.reload();
    };

    if (error && !riderData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-orange-500 text-white rounded-xl"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!riderData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-pink-600 px-6 pt-8 pb-6 rounded-b-3xl">
                <h1 className="text-2xl font-bold text-white mb-4">Profile</h1>

                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 font-bold text-lg">
                            {riderData.fullName?.[0] || 'R'}
                        </div>
                        <div>
                            <p className="text-white font-semibold">{riderData.fullName || 'Rider'}</p>
                            <p className="text-white/80 text-sm">{riderData.user?.email || 'rider@example.com'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition"
                    >
                        <FaCog />
                    </button>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="px-6 -mt-4 mb-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-4">Performance Metrics</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-yellow-50 rounded-xl">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FaStar className="text-yellow-600" />
                            </div>
                            <p className="text-xs text-gray-600 mb-1">Rating</p>
                            <p className="text-xl font-bold text-gray-900">{riderData.stats?.rating?.toFixed(1) || '0.0'}</p>
                        </div>

                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FaCheckCircle className="text-blue-600" />
                            </div>
                            <p className="text-xs text-gray-600 mb-1">Deliveries</p>
                            <p className="text-xl font-bold text-gray-900">{riderData.stats?.totalDeliveries || 0}</p>
                        </div>

                        <div className="text-center p-4 bg-green-50 rounded-xl">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FaCheckCircle className="text-green-600" />
                            </div>
                            <p className="text-xs text-gray-600 mb-1">On-Time</p>
                            <p className="text-xl font-bold text-gray-900">{riderData.stats?.onTimeRate || 100}%</p>
                        </div>

                        <div className="text-center p-4 bg-purple-50 rounded-xl">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FaCheckCircle className="text-purple-600" />
                            </div>
                            <p className="text-xs text-gray-600 mb-1">Acceptance</p>
                            <p className="text-xl font-bold text-gray-900">{riderData.stats?.acceptanceRate || 100}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Personal Information */}
            <div className="px-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                <div className="bg-white rounded-2xl overflow-hidden">
                    <InfoItem icon={<FaUser />} label="Full Name" value={riderData.fullName || 'N/A'} />
                    <InfoItem icon={<FaPhone />} label="Phone Number" value={riderData.user?.phone || '+92 329 5599855'} />
                    <InfoItem icon={<FaEnvelope />} label="Email" value={riderData.user?.email || 'rider@example.com'} />
                    <InfoItem icon={<FaBicycle />} label="Vehicle Type" value={riderData.vehicleType || 'Bike'} />
                    <InfoItem icon={<FaMapMarkerAlt />} label="City" value={riderData.city || 'Lahore'} />
                </div>
            </div>

            {/* Documents */}
            <div className="px-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Documents</h3>
                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
                    <DocumentItem
                        title="CNIC"
                        status={riderData.documents?.cnicFront ? 'Verified' : 'Not Uploaded'}
                        verified={!!riderData.documents?.cnicFront}
                    />
                    <DocumentItem
                        title="Driving License"
                        status={riderData.documents?.drivingLicense ? 'Verified' : 'Not Uploaded'}
                        verified={!!riderData.documents?.drivingLicense}
                    />
                    <DocumentItem
                        title="Vehicle Registration"
                        status={riderData.documents?.vehicleRegistration ? 'Verified' : 'Not Uploaded'}
                        verified={!!riderData.documents?.vehicleRegistration}
                    />
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full bg-white rounded-2xl p-4 flex items-center justify-center gap-2 text-red-600 font-semibold hover:bg-red-50 transition border border-red-200"
                >
                    <FaSignOutAlt /> Logout
                </button>
            </div>

            {/* Notifications Modal */}
            {isNotificationsOpen && (
                <NotificationsModal onClose={() => setIsNotificationsOpen(false)} />
            )}

            {/* Settings Modal */}
            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Settings</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    defaultValue={riderData.user?.phone}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                    disabled
                                />
                                <p className="text-xs text-gray-400 mt-1">Contact support to change phone number</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <select
                                    defaultValue={riderData.city || 'Lahore'}
                                    id="city-select"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="Lahore">Lahore</option>
                                    <option value="Karachi">Karachi</option>
                                    <option value="Islamabad">Islamabad</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition"
                                    onClick={async () => {
                                        try {
                                            const citySelect = document.getElementById('city-select') as HTMLSelectElement;
                                            const newCity = citySelect.value;

                                            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                                            const res = await axios.put(`${API_BASE_URL}/api/riders/${riderId}/profile`,
                                                { city: newCity },
                                                { headers: { Authorization: `Bearer ${token}` } }
                                            );

                                            setRiderData(res.data);
                                            setIsSettingsOpen(false);
                                            alert('Settings saved successfully!');
                                        } catch (error) {
                                            console.error('Error saving settings:', error);
                                            alert('Failed to save settings');
                                        }
                                    }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNotifications(res.data);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(`${API_BASE_URL}/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-3xl w-full max-w-md h-[80vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FaTimes />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FaBell className="text-4xl mx-auto mb-3 text-gray-300" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification._id}
                                className={`p-4 rounded-xl border ${notification.read ? 'bg-white border-gray-100' : 'bg-orange-50 border-orange-100'}`}
                                onClick={() => !notification.read && markAsRead(notification._id)}
                            >
                                <div className="flex gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.read ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-500'}`}>
                                        <FaBell />
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold ${notification.read ? 'text-gray-900' : 'text-orange-900'}`}>{notification.title}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="p-4 flex items-center gap-3 border-b border-gray-100 last:border-b-0">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-semibold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

function DocumentItem({ title, status, verified }: { title: string; status: string; verified: boolean }) {
    return (
        <div className="p-4 flex items-center justify-between">
            <div>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className={`text-sm ${verified ? 'text-green-600' : 'text-gray-500'}`}>{status}</p>
            </div>
            <FaChevronRight className="text-gray-400" />
        </div>
    );
}

function SettingItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full p-4 flex items-center gap-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition"
        >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                {icon}
            </div>
            <p className="flex-1 text-left font-medium text-gray-900">{label}</p>
            <FaChevronRight className="text-gray-400" />
        </button>
    );
}
