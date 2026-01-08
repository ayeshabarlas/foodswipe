'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaMotorcycle, FaWallet, FaHistory, FaUser, 
    FaBell, FaSignOutAlt, FaMapMarkerAlt, FaShoppingBag,
    FaCheckCircle, FaClock, FaExclamationCircle
} from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import RiderOrders from './RiderOrders';
import RiderEarnings from './RiderEarnings';
import RiderProfile from './RiderProfile';

const RiderDashboard = ({ riderId }: { riderId?: string }) => {
    const [activeTab, setActiveTab] = useState('available');
    const [riderData, setRiderData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRiderData = async () => {
        try {
            const userStr = localStorage.getItem('userInfo');
            if (!userStr) return;
            const userInfo = JSON.parse(userStr);
            const token = userInfo.token;
            
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(`${API_BASE_URL}/api/riders/profile`, config);
            setRiderData(data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching rider data:', err);
            setError('Failed to load rider profile');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRiderData();
        // Safety timeout
        const timer = setTimeout(() => {
            if (loading) setLoading(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Simple Header */}
            <div className="bg-white px-4 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-full">
                        <FaMotorcycle className="text-orange-600 text-xl" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 text-lg">Rider Dashboard</h1>
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online & Ready
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
                >
                    <FaSignOutAlt className="text-xl" />
                </button>
            </div>

            {/* Main Content */}
            <div className="p-4 max-w-lg mx-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'available' && (
                        <motion.div
                            key="available"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <RiderOrders />
                        </motion.div>
                    )}
                    {activeTab === 'earnings' && (
                        <motion.div
                            key="earnings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <RiderEarnings />
                        </motion.div>
                    )}
                    {activeTab === 'profile' && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <RiderProfile />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Navigation - Simple Style */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20">
                <button 
                    onClick={() => setActiveTab('available')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'available' ? 'text-orange-500' : 'text-gray-400'}`}
                >
                    <FaShoppingBag className="text-xl" />
                    <span className="text-[10px] font-bold">Orders</span>
                </button>
                <button 
                    onClick={() => setActiveTab('earnings')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'earnings' ? 'text-orange-500' : 'text-gray-400'}`}
                >
                    <FaWallet className="text-xl" />
                    <span className="text-[10px] font-bold">Earnings</span>
                </button>
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-orange-500' : 'text-gray-400'}`}
                >
                    <FaUser className="text-xl" />
                    <span className="text-[10px] font-bold">Profile</span>
                </button>
            </div>
        </div>
    );
};

export default RiderDashboard;
