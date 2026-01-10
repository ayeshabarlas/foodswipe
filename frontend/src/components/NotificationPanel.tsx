'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaTimes, FaBox, FaWallet, FaStar, FaCheckCircle, FaBell } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { initSocket, getSocket } from '../utils/socket';

interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'order' | 'payment' | 'milestone' | 'system';
    createdAt: string;
    read: boolean;
}

interface NotificationPanelProps {
    onClose: () => void;
    riderId: string;
    onReadUpdate?: () => void;
}

export default function NotificationPanel({ onClose, riderId, onReadUpdate }: NotificationPanelProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
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

        // Socket listener for real-time notifications
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const socket = getSocket() || initSocket(userInfo._id, 'rider', undefined, riderId);

        if (socket) {
            socket.on('notification', (newNotification: Notification) => {
                setNotifications(prev => [newNotification, ...prev]);
                // Play notification sound if needed
                try {
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(e => console.log('Audio play failed'));
                } catch (e) {}
            });
        }

        return () => {
            if (socket) {
                socket.off('notification');
            }
        };
    }, [riderId]);

    const markAllAsRead = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(`${API_BASE_URL}/api/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            if (onReadUpdate) onReadUpdate();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(`${API_BASE_URL}/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            if (onReadUpdate) onReadUpdate();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const getTimeAgo = (date: string) => {
        if (!date) return 'Recently';
        const created = new Date(date).getTime();
        if (isNaN(created)) return 'Recently';
        
        const seconds = Math.floor((new Date().getTime() - created) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} mins ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return new Date(date).toLocaleDateString();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'order':
                return <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center"><FaBox size={18} /></div>;
            case 'payment':
                return <div className="w-10 h-10 bg-green-50 text-green-500 rounded-full flex items-center justify-center"><FaWallet size={18} /></div>;
            case 'milestone':
                return <div className="w-10 h-10 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center"><FaStar size={18} /></div>;
            default:
                return <div className="w-10 h-10 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center"><FaBell size={18} /></div>;
        }
    };

    return (
        <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[150] flex flex-col"
        >
            {/* Header - Screenshot Style */}
            <div className="bg-gradient-to-r from-[#FF4D00] to-[#FF007A] p-6 text-white relative">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                    <FaTimes />
                </button>
                <h2 className="text-2xl font-bold mb-1">Notifications</h2>
                <p className="text-white/80 text-sm font-bold">
                    {notifications.length === 0 ? 'All caught up!' : `${notifications.filter(n => !n.read).length} new updates`}
                </p>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF4D00]"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                            <FaBell size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">No notifications yet</h3>
                        <p className="text-gray-400 text-sm mt-1">We'll notify you when something important happens.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.map((notification) => (
                            <div 
                                key={notification._id} 
                                onClick={() => !notification.read && markAsRead(notification._id)}
                                className={`p-5 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-orange-50/30' : ''}`}
                            >
                                <div className="flex-shrink-0">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-gray-900 text-sm">{notification.title}</h4>
                                        {!notification.read && <div className="w-2 h-2 bg-[#FF4D00] rounded-full"></div>}
                                    </div>
                                    <p className="text-gray-500 text-xs font-medium leading-relaxed mb-2">{notification.message}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{getTimeAgo(notification.createdAt)}</span>
                                        {notification.read && <FaCheckCircle className="text-green-500" size={12} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {notifications.some(n => !n.read) && (
                <div className="p-4 border-t border-gray-50">
                    <button 
                        onClick={markAllAsRead}
                        className="w-full py-3 text-[#FF4D00] font-bold text-xs uppercase tracking-widest hover:bg-orange-50 rounded-xl transition-colors"
                    >
                        Mark all as read
                    </button>
                </div>
            )}
        </motion.div>
    );
}
