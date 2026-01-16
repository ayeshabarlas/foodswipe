'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { getImageUrl } from '../../utils/imageUtils';
import { FaCheckCircle, FaTimesCircle, FaEye, FaSpinner, FaStore, FaMotorcycle, FaFileAlt } from 'react-icons/fa';

export default function VerificationsView({ initialTab = 'restaurants' }: { initialTab?: string }) {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [riders, setRiders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchVerifications();

        // Join admin room for real-time updates
        const userInfo = localStorage.getItem('userInfo');
        let socket: any;

        if (userInfo) {
            try {
                const user = JSON.parse(userInfo);
                socket = io(SOCKET_URL);
                
                socket.on('connect', () => {
                    console.log('Connected to socket for verification updates');
                    socket.emit('join', { userId: user._id, role: 'admin' });
                });

                socket.on('restaurant_registered', (newRestaurant: any) => {
                    console.log('New restaurant registered for verification:', newRestaurant);
                    fetchVerifications();
                });

                socket.on('rider_registered', (newRider: any) => {
                    console.log('New rider registered for verification:', newRider);
                    fetchVerifications();
                });

                socket.on('verification_updated', () => {
                    console.log('Verification updated, refreshing...');
                    fetchVerifications();
                });
            } catch (e) {
                console.error('Error setting up socket in VerificationsView:', e);
            }
        }

        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    const fetchVerifications = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };

            const [restaurantsRes, ridersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/verifications/restaurants`, config),
                axios.get(`${API_BASE_URL}/api/verifications/riders`, config)
            ]);

            setRestaurants(Array.isArray(restaurantsRes.data) ? restaurantsRes.data : (restaurantsRes.data?.restaurants || []));
            setRiders(Array.isArray(ridersRes.data) ? ridersRes.data : (ridersRes.data?.riders || []));
        } catch (error) {
            console.error('Error fetching verifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject', type: 'restaurant' | 'rider') => {
        if (action === 'reject' && !rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        setProcessing(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };

            const endpoint = type === 'restaurant'
                ? `${API_BASE_URL}/api/verifications/restaurants/${id}`
                : `${API_BASE_URL}/api/verifications/riders/${id}`;

            await axios.put(endpoint, { action, rejectionReason }, config);

            // alert(`${type === 'restaurant' ? 'Restaurant' : 'Rider'} ${action}ed successfully!`);
            setSelectedItem(null);
            setRejectionReason('');
            fetchVerifications();
        } catch (error: any) {
            console.error('Action error:', error);
            alert(error.response?.data?.message || 'Action failed');
        } finally {
            setProcessing(false);
        }
    };

    const Card = ({ item, type }: { item: any, type: 'restaurant' | 'rider' }) => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${type === 'restaurant' ? 'bg-orange-50 text-[#FF6A00]' : 'bg-blue-50 text-blue-600'}`}>
                        {type === 'restaurant' ? <FaStore className="text-lg" /> : <FaMotorcycle className="text-lg" />}
                    </div>
                    <div>
                        <h3 className="text-[15px] font-bold text-[#111827] tracking-tight">{item.name || item.fullName}</h3>
                        <p className="text-[12px] text-[#6B7280]">{item.owner?.email || item.user?.email}</p>
                    </div>
                </div>
                <span className="px-2.5 py-1 bg-yellow-50 text-yellow-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Pending
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                    <span className="block text-[10px] text-[#9CA3AF] uppercase font-bold mb-1 tracking-wider">Type</span>
                    <span className="text-[13px] font-semibold text-[#111827] capitalize">{item.businessType || 'Rider'}</span>
                </div>
                <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                    <span className="block text-[10px] text-[#9CA3AF] uppercase font-bold mb-1 tracking-wider">Contact</span>
                    <span className="text-[13px] font-semibold text-[#111827]">{item.contact || item.user?.phone}</span>
                </div>
            </div>

            <button
                onClick={() => setSelectedItem(item)}
                className={`w-full py-3.5 border-2 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider active:scale-95 shadow-sm
                    ${type === 'restaurant' 
                        ? 'border-orange-500 text-orange-600 hover:bg-gradient-to-r hover:from-orange-500 hover:to-pink-500 hover:text-white hover:border-transparent hover:shadow-orange-500/20' 
                        : 'border-blue-500 text-blue-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:text-white hover:border-transparent hover:shadow-blue-500/20'}`}
            >
                <FaEye className="text-sm" /> Review Documents
            </button>
        </motion.div>
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#111827] tracking-tight">Verification Queue</h2>
                    <p className="text-[14px] font-normal text-[#6B7280] mt-1">Review and approve new platform partners</p>
                </div>
                <div className="flex gap-1 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100">
                    <button
                        onClick={() => setActiveTab('restaurants')}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all uppercase tracking-wider ${activeTab === 'restaurants'
                            ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20'
                            : 'text-[#6B7280] hover:bg-white/50'
                            }`}
                    >
                        Restaurants ({restaurants.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('riders')}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all uppercase tracking-wider ${activeTab === 'riders'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-[#6B7280] hover:bg-white/50'
                            }`}
                    >
                        Riders ({riders.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="w-12 h-12 border-4 border-[#FF6A00]/20 border-t-[#FF6A00] rounded-full animate-spin"></div>
                    <p className="text-[#6B7280] text-[13px] font-medium animate-pulse uppercase tracking-wider">Loading queue...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeTab === 'restaurants' ? (
                        (Array.isArray(restaurants) && restaurants.length > 0) ? (
                            restaurants.map(r => <Card key={r._id} item={r} type="restaurant" />)
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-96 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                    <FaCheckCircle className="text-2xl text-green-500" />
                                </div>
                                <p className="text-[#111827] font-bold text-[15px]">All caught up!</p>
                                <p className="text-[#6B7280] text-[13px]">No pending restaurant verifications</p>
                            </div>
                        )
                    ) : (
                        (Array.isArray(riders) && riders.length > 0) ? (
                            riders.map(r => <Card key={r._id} item={r} type="rider" />)
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-96 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                    <FaCheckCircle className="text-2xl text-green-500" />
                                </div>
                                <p className="text-[#111827] font-bold text-[15px]">All caught up!</p>
                                <p className="text-[#6B7280] text-[13px]">No pending rider verifications</p>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Verification Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#111827]/60 z-50 flex items-center justify-center p-4 backdrop-blur-md"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">{selectedItem.name || selectedItem.fullName}</h3>
                                        <span className="px-2.5 py-1 bg-[#FF6A00]/10 text-[#FF6A00] rounded-full text-[10px] font-bold uppercase tracking-wider">Verification Request</span>
                                    </div>
                                    <p className="text-[13px] text-[#6B7280] mt-0.5">{selectedItem.owner?.email || selectedItem.user?.email}</p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-200/50 rounded-2xl transition-all text-[#111827]">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8">
                                {/* Official Documents */}
                                <div className="mb-10">
                                    <h4 className="text-[13px] font-bold text-[#111827] mb-6 flex items-center gap-3 uppercase tracking-wider">
                                        <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full"></div>
                                        Partner Documentation
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {(selectedItem.name 
                                            ? ['cnicFront', 'cnicBack', 'license', 'menu'] 
                                            : ['cnicFront', 'cnicBack', 'drivingLicense', 'vehicleRegistration', 'profileSelfie']
                                        ).map((docKey) => (
                                            <div key={docKey} className="group relative">
                                                <p className="text-[11px] font-bold text-[#6B7280] mb-3 capitalize uppercase tracking-widest">{docKey.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <div className="aspect-[4/3] bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 relative shadow-inner group-hover:border-[#FF6A00]/30 transition-all duration-300">
                                                    {selectedItem.documents?.[docKey] ? (
                                                        <>
                                                            <img
                                                                src={getImageUrl(selectedItem.documents?.[docKey])}
                                                                alt={docKey}
                                                                className="w-full h-full object-contain bg-gray-50 transition-transform duration-700 group-hover:scale-110"
                                                            />
                                                            <div className="absolute inset-0 bg-[#111827]/0 group-hover:bg-[#111827]/5 transition-colors pointer-events-none" />
                                                            <a
                                                                href={getImageUrl(selectedItem.documents?.[docKey])}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-xl text-[11px] font-bold text-[#111827] shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex items-center gap-2 hover:bg-[#111827] hover:text-white"
                                                            >
                                                                <FaEye className="text-sm" /> Full View
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-[#9CA3AF] bg-gray-50/50">
                                                            <FaFileAlt className="text-2xl mb-3 opacity-20" />
                                                            <span className="text-[11px] font-bold uppercase tracking-widest">Not Provided</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Storefront & Menu Section */}
                                {(selectedItem.storefrontPhoto || (selectedItem.menuPhotos && selectedItem.menuPhotos.length > 0)) && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        {selectedItem.storefrontPhoto && (
                                            <div>
                                                <h4 className="text-[13px] font-bold text-[#111827] mb-6 flex items-center gap-3 uppercase tracking-wider">
                                                    <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full"></div>
                                                    Storefront View
                                                </h4>
                                                <div className="aspect-video bg-gray-50 rounded-[2rem] overflow-hidden border border-gray-100 group relative">
                                                    <img
                                                        src={getImageUrl(selectedItem.storefrontPhoto)}
                                                        alt="Storefront"
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <a
                                                        href={getImageUrl(selectedItem.storefrontPhoto)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="absolute inset-0 bg-[#111827]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <span className="bg-white text-[#111827] px-6 py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider">View Original</span>
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {selectedItem.menuPhotos && selectedItem.menuPhotos.length > 0 && (
                                            <div>
                                                <h4 className="text-[13px] font-bold text-[#111827] mb-6 flex items-center gap-3 uppercase tracking-wider">
                                                    <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full"></div>
                                                    Menu Items
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {selectedItem.menuPhotos.slice(0, 4).map((photo: string, index: number) => (
                                                        <div key={index} className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group relative">
                                                            <img
                                                                src={getImageUrl(photo)}
                                                                alt={`Menu ${index + 1}`}
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                            />
                                                            <a
                                                                href={getImageUrl(photo)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="absolute inset-0 bg-[#111827]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <FaEye className="text-white text-xl" />
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!Object.values(selectedItem.documents || {}).some(Boolean) && !selectedItem.storefrontPhoto && (!selectedItem.menuPhotos || selectedItem.menuPhotos.length === 0) && (
                                    <div className="py-16 flex flex-col items-center justify-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                            <FaFileAlt className="text-3xl text-gray-200" />
                                        </div>
                                        <p className="text-[#111827] font-bold text-[15px]">No documents found</p>
                                        <p className="text-[#6B7280] text-[13px]">This partner hasn't uploaded any verification files yet.</p>
                                    </div>
                                )}

                                <div className="mt-10 bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100">
                                    <label className="block text-[11px] font-bold text-[#6B7280] mb-3 uppercase tracking-widest">Rejection Feedback (Optional)</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00] outline-none text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-all"
                                        placeholder="Explain why the application is being rejected..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-100 flex gap-4 bg-white">
                                <button
                                    onClick={() => handleAction(selectedItem._id, 'approve', selectedItem.name ? 'restaurant' : 'rider')}
                                    disabled={processing}
                                    className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-[13px] uppercase tracking-wider shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {processing ? <FaSpinner className="animate-spin text-lg" /> : <FaCheckCircle className="text-lg" />}
                                    Approve Application
                                </button>
                                <button
                                    onClick={() => handleAction(selectedItem._id, 'reject', selectedItem.name ? 'restaurant' : 'rider')}
                                    disabled={processing}
                                    className="flex-1 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-[13px] uppercase tracking-wider transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {processing ? <FaSpinner className="animate-spin text-lg" /> : <FaTimesCircle className="text-lg" />}
                                    Reject Partner
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
