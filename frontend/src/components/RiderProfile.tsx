'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaStar, FaCheckCircle, FaUser, FaPhone, FaEnvelope, FaBicycle, FaMapMarkerAlt, FaBell, FaCog, FaSignOutAlt, FaChevronRight, FaTimes, FaCamera, FaIdCard, FaCarSide } from 'react-icons/fa';

interface RiderProfileProps {
    riderId: string;
}

export default function RiderProfile({ riderId }: RiderProfileProps) {
    const [riderData, setRiderData] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchRiderData = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            const res = await axios.get(`${API_BASE_URL}/api/riders/my-profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRiderData(res.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching rider data:', error);
            setError('Failed to load profile');
        }
    };

    const fetchUnreadNotifications = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const unread = res.data.filter((n: any) => !n.read).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchRiderData();
        fetchUnreadNotifications();

        const interval = setInterval(() => {
            fetchRiderData();
            fetchUnreadNotifications();
        }, 10000);
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
        <div className="min-h-screen bg-[#F8F9FA] pb-24 font-light">
            {/* Header */}
            <div className="bg-[#008C44] px-6 pt-12 pb-20 rounded-b-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h1 className="text-xl font-medium text-white tracking-tight">Profile</h1>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsNotificationsOpen(true)}
                            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white relative hover:bg-white/20 transition-all"
                        >
                            <FaBell className="text-lg" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFD700] text-[#008C44] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#008C44]">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
                        >
                            <FaCog className="text-lg" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="relative">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[24px] border-2 border-white/30 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-xl">
                            {riderData.fullName?.[0] || 'R'}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FFD700] rounded-lg flex items-center justify-center text-[#008C44] text-xs border-2 border-[#008C44] shadow-lg">
                            <FaCamera />
                        </button>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white leading-tight">{riderData.fullName || 'Rider'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded-md text-[10px] font-medium text-white/90 border border-white/20 uppercase tracking-wider">
                                {riderData.vehicleType || 'Bike'}
                            </span>
                            <span className="flex items-center gap-1 text-white/80 text-xs">
                                <FaMapMarkerAlt className="text-[10px]" />
                                {riderData.city || 'Lahore'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="px-6 -mt-12 relative z-10 mb-8">
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
                    <div className="grid grid-cols-2 gap-6">
                        <MetricItem 
                            icon={<FaStar className="text-[#FFD700]" />} 
                            label="Rating" 
                            value={riderData.stats?.rating?.toFixed(1) || '0.0'} 
                            color="bg-yellow-50"
                        />
                        <MetricItem 
                            icon={<FaCheckCircle className="text-[#008C44]" />} 
                            label="Deliveries" 
                            value={riderData.stats?.totalDeliveries || 0} 
                            color="bg-green-50"
                        />
                        <MetricItem 
                            icon={<FaCheckCircle className="text-blue-500" />} 
                            label="On-Time" 
                            value={`${riderData.stats?.onTimeRate || 100}%`} 
                            color="bg-blue-50"
                        />
                        <MetricItem 
                            icon={<FaCheckCircle className="text-purple-500" />} 
                            label="Acceptance" 
                            value={`${riderData.stats?.acceptanceRate || 100}%`} 
                            color="bg-purple-50"
                        />
                    </div>
                </div>
            </div>

            {/* Information Sections */}
            <div className="px-6 space-y-6">
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-2">Personal Details</h3>
                    </div>
                    <div className="bg-white rounded-[28px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50">
                        <InfoItem icon={<FaUser className="text-gray-400" />} label="Full Name" value={riderData.fullName || 'N/A'} />
                        <InfoItem icon={<FaPhone className="text-gray-400" />} label="Phone" value={riderData.user?.phone || 'N/A'} />
                        <InfoItem icon={<FaEnvelope className="text-gray-400" />} label="Email" value={riderData.user?.email || 'N/A'} />
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-2">Documents</h3>
                    </div>
                    <div className="bg-white rounded-[28px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50">
                        <DocumentItem 
                            icon={<FaIdCard className="text-gray-400" />}
                            title="CNIC" 
                            status={riderData.documents?.cnicFront ? 'Verified' : 'Action Required'} 
                            verified={!!riderData.documents?.cnicFront} 
                            onClick={() => {
                                setSelectedDoc('CNIC');
                                setIsUploadOpen(true);
                            }}
                        />
                        <DocumentItem 
                            icon={<FaCarSide className="text-gray-400" />}
                            title="Driving License" 
                            status={riderData.documents?.drivingLicense ? 'Verified' : 'Action Required'} 
                            verified={!!riderData.documents?.drivingLicense} 
                            onClick={() => {
                                setSelectedDoc('Driving License');
                                setIsUploadOpen(true);
                            }}
                        />
                    </div>
                </section>

                <button
                    onClick={handleLogout}
                    className="w-full bg-white text-red-500 font-medium py-4 rounded-[24px] flex items-center justify-center gap-3 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-red-50 hover:bg-red-50 transition-all active:scale-95"
                >
                    <FaSignOutAlt className="text-lg" />
                    <span>Logout Account</span>
                </button>
            </div>

            {/* Modals */}
            {isNotificationsOpen && (
                <NotificationsModal 
                    onClose={() => {
                        setIsNotificationsOpen(false);
                        fetchUnreadNotifications();
                    }} 
                />
            )}
            {isSettingsOpen && (
                <SettingsModal 
                    riderData={riderData} 
                    riderId={riderId} 
                    onClose={() => setIsSettingsOpen(false)} 
                    onUpdate={fetchRiderData}
                />
            )}
            {isUploadOpen && (
                <UploadModal 
                    title={selectedDoc || 'Document'} 
                    onClose={() => setIsUploadOpen(false)} 
                    onUpload={fetchRiderData}
                />
            )}
        </div>
    );
}

function MetricItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-2 shadow-sm`}>
                {icon}
            </div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter mb-0.5">{label}</p>
            <p className="text-lg font-bold text-gray-900 tracking-tight">{value}</p>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-4 p-5 border-b border-gray-50 last:border-b-0">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-sm font-bold text-gray-900 tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function DocumentItem({ icon, title, status, verified, onClick }: { icon: React.ReactNode; title: string; status: string; verified: boolean; onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center justify-between p-5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-all group"
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white transition-all">
                    {icon}
                </div>
                <div className="text-left">
                    <p className="text-sm font-bold text-gray-900 tracking-tight">{title}</p>
                    <p className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${verified ? 'text-[#008C44]' : 'text-orange-500'}`}>
                        {status}
                    </p>
                </div>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${verified ? 'bg-green-50 text-[#008C44]' : 'bg-gray-50 text-gray-300 group-hover:text-[#008C44]'}`}>
                {verified ? <FaCheckCircle size={14} /> : <FaChevronRight size={12} />}
            </div>
        </button>
    );
}

function UploadModal({ title, onClose, onUpload }: { title: string; onClose: () => void; onUpload: () => void }) {
    const [uploading, setUploading] = useState(false);

    const handleSimulatedUpload = () => {
        setUploading(true);
        setTimeout(() => {
            setUploading(false);
            onUpload();
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4">
            <div className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-slide-up">
                <div className="w-12 h-1 bg-gray-100 rounded-full mx-auto mb-8 sm:hidden"></div>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Upload {title}</h3>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                        <FaTimes />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="border-2 border-dashed border-gray-100 rounded-[32px] p-12 flex flex-col items-center justify-center text-center group hover:border-[#008C44]/20 transition-all cursor-pointer">
                        <div className="w-16 h-16 bg-gray-50 rounded-[24px] flex items-center justify-center text-gray-300 group-hover:text-[#008C44] group-hover:bg-green-50 transition-all mb-4">
                            <FaCamera size={24} />
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-1">Take a photo</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">or browse gallery</p>
                    </div>

                    <button
                        onClick={handleSimulatedUpload}
                        disabled={uploading}
                        className={`w-full py-5 bg-[#008C44] text-white font-bold rounded-[24px] shadow-lg shadow-[#008C44]/20 hover:bg-[#007036] transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${uploading ? 'opacity-70' : ''}`}
                    >
                        {uploading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : 'Confirm Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SettingsModal({ riderData, riderId, onClose, onUpdate }: { riderData: any; riderId: string; onClose: () => void; onUpdate: () => void }) {
    const [city, setCity] = useState(riderData.city || 'Lahore');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(`${API_BASE_URL}/api/riders/${riderId}/profile`,
                { city },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onUpdate();
            onClose();
            // Show a nice toast or alert here if available
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-[100] transition-all duration-300">
            <div className="bg-white w-full rounded-t-[40px] p-8 pb-10 shadow-2xl transform transition-transform animate-slide-up">
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-8"></div>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h3>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                        <FaTimes />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">Phone Number</label>
                        <div className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-400 flex items-center gap-3">
                            <FaPhone className="text-sm" />
                            <span className="font-medium">{riderData.user?.phone || 'N/A'}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 px-1">Contact support to update verified phone number.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">Service City</label>
                        <div className="relative">
                            <select
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] appearance-none shadow-sm transition-all"
                            >
                                <option value="Lahore">Lahore</option>
                                <option value="Karachi">Karachi</option>
                                <option value="Islamabad">Islamabad</option>
                                <option value="Rawalpindi">Rawalpindi</option>
                                <option value="Faisalabad">Faisalabad</option>
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <FaChevronRight className="rotate-90 text-xs" />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full py-5 bg-[#008C44] text-white font-bold rounded-[24px] shadow-lg shadow-[#008C44]/20 hover:bg-[#007036] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 ${saving ? 'opacity-70' : ''}`}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100]">
            <div className="bg-[#F8F9FA] w-full max-w-lg sm:rounded-[40px] rounded-t-[40px] h-[85vh] sm:h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
                <div className="p-8 bg-white border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wider">Stay updated with your orders</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                        <FaTimes />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-10 h-10 border-3 border-[#008C44]/20 border-t-[#008C44] rounded-full animate-spin mb-4"></div>
                            <p className="text-sm text-gray-400 font-medium">Fetching alerts...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-16 px-8">
                            <div className="w-20 h-20 bg-gray-100 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                                <FaBell className="text-3xl text-gray-300" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">No notifications yet</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">We'll notify you when something important happens.</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification._id}
                                className={`p-5 rounded-[28px] border transition-all cursor-pointer active:scale-[0.98] ${notification.read ? 'bg-white border-gray-100' : 'bg-white border-[#008C44]/20 shadow-md shadow-[#008C44]/5'}`}
                                onClick={() => !notification.read && markAsRead(notification._id)}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${notification.read ? 'bg-gray-50 text-gray-400' : 'bg-[#008C44]/10 text-[#008C44]'}`}>
                                        <FaBell className="text-lg" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`font-bold text-sm tracking-tight ${notification.read ? 'text-gray-700' : 'text-[#008C44]'}`}>{notification.title}</h4>
                                            {!notification.read && <span className="w-2 h-2 bg-[#008C44] rounded-full"></span>}
                                        </div>
                                        <p className="text-sm text-gray-500 leading-relaxed mb-3">{notification.message}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                {new Date(notification.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
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
