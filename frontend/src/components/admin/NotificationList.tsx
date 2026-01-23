'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../utils/config';
import { FaBell, FaCheck, FaInfoCircle, FaShoppingBag, FaStore, FaMotorcycle, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface Notification {
    _id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
    data?: any;
}

export default function NotificationList({ onClose }: { onClose?: () => void }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const res = await axios.get(`${getApiUrl()}/api/admin/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        fetchNotifications();
    };

    const markAsRead = async (id: string) => {
        try {
            const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${getApiUrl()}/api/admin/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (error) {
            toast.error('Failed to mark as read');
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'order': return <FaShoppingBag className="text-orange-500" />;
            case 'new_restaurant': return <FaStore className="text-pink-500" />;
            case 'new_rider': return <FaMotorcycle className="text-blue-500" />;
            case 'alert': return <FaExclamationTriangle className="text-yellow-500" />;
            default: return <FaInfoCircle className="text-blue-400" />;
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            // We use a separate endpoint or just loop for now if no bulk endpoint exists
            // To be efficient, let's assume the backend can handle a bulk request or we just local-update
            await Promise.all(notifications.filter(n => !n.read).map(n =>
                axios.put(`${getApiUrl()}/api/admin/notifications/${n._id}/read`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ));
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-full max-h-[500px] w-[350px]">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-orange-50 to-pink-50">
                <div className="flex items-center gap-2">
                    <FaBell className="text-orange-500" />
                    <h3 className="font-bold text-gray-800">Notifications</h3>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className={`text-gray-400 hover:text-orange-500 transition-all ${loading ? 'animate-spin' : ''}`}
                        title="Refresh"
                    >
                        <FaSync className="text-xs" />
                    </button>
                    {notifications.some(n => !n.read) && (
                        <button
                            onClick={markAllRead}
                            className="text-[10px] bg-white px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:text-orange-500 hover:border-orange-200 transition-all font-bold"
                        >
                            Mark all read
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading alerts...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FaBell className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">No new alerts</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((n) => (
                            <div
                                key={n._id}
                                className={`p-3 rounded-xl transition-all duration-200 flex gap-3 border ${n.read ? 'bg-white border-transparent' : 'bg-orange-50/30 border-orange-100'
                                    }`}
                            >
                                <div className="mt-1 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className={`text-sm font-bold truncate ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</h4>
                                        {!n.read && (
                                            <button
                                                onClick={() => markAsRead(n._id)}
                                                className="text-[10px] text-orange-600 font-bold hover:underline whitespace-nowrap"
                                            >
                                                Mark Read
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-gray-50 bg-gray-50 text-center">
                <button className="text-xs font-bold text-gray-500 hover:text-orange-500 transition-colors">
                    View All Activity
                </button>
            </div>
        </div>
    );
}
