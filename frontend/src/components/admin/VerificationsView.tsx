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

        const socket = io(SOCKET_URL);
        
        socket.on('restaurant_registered', () => {
            console.log('New restaurant registration detected, refreshing verifications...');
            fetchVerifications();
        });

        socket.on('restaurant_updated', () => {
            console.log('Restaurant update detected, refreshing verifications...');
            fetchVerifications();
        });

        socket.on('rider_updated', () => {
            console.log('Rider update detected, refreshing verifications...');
            fetchVerifications();
        });

        return () => {
            socket.disconnect();
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
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${type === 'restaurant' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                        {type === 'restaurant' ? <FaStore className="text-base" /> : <FaMotorcycle className="text-base" />}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">{item.name || item.fullName}</h3>
                        <p className="text-[10px] text-gray-500">{item.owner?.email || item.user?.email}</p>
                    </div>
                </div>
                <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full text-[10px] font-bold uppercase">
                    Pending
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-gray-400 uppercase font-bold mb-0.5">Type</span>
                    <span className="text-[11px] font-bold text-gray-700 capitalize">{item.businessType || 'Rider'}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-gray-400 uppercase font-bold mb-0.5">Contact</span>
                    <span className="text-[11px] font-bold text-gray-700">{item.contact || item.user?.phone}</span>
                </div>
            </div>

            <button
                onClick={() => setSelectedItem(item)}
                className="w-full py-2 border-2 border-orange-500 text-orange-500 font-bold rounded-lg hover:bg-orange-50 transition flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider"
            >
                <FaEye /> Review Documents
            </button>
        </motion.div>
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Pending Approvals</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Review and verify new registrations</p>
                </div>
                <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
                    <button
                        onClick={() => setActiveTab('restaurants')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider ${activeTab === 'restaurants'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        Restaurants ({restaurants.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('riders')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider ${activeTab === 'riders'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        Riders ({riders.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <FaSpinner className="animate-spin text-3xl text-orange-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeTab === 'restaurants' ? (
                        (Array.isArray(restaurants) && restaurants.length > 0) ? (
                            restaurants.map(r => <Card key={r._id} item={r} type="restaurant" />)
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400">
                                <FaCheckCircle className="text-4xl mb-3 text-gray-200" />
                                <p className="text-sm font-medium">No pending restaurant verifications</p>
                            </div>
                        )
                    ) : (
                        (Array.isArray(riders) && riders.length > 0) ? (
                            riders.map(r => <Card key={r._id} item={r} type="rider" />)
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400">
                                <FaCheckCircle className="text-4xl mb-3 text-gray-200" />
                                <p className="text-sm font-medium">No pending rider verifications</p>
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
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{selectedItem.name || selectedItem.fullName}</h3>
                                    <p className="text-xs text-gray-500">Verification Request</p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-1.5 hover:bg-gray-200 rounded-full transition text-sm">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Official Documents */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2 uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                                        Official Documents
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {(selectedItem.name 
                                            ? ['cnicFront', 'cnicBack', 'license', 'menu'] 
                                            : ['cnicFront', 'cnicBack', 'drivingLicense', 'vehicleRegistration', 'profileSelfie']
                                        ).map((docKey) => (
                                            <div key={docKey} className="group relative">
                                                <p className="text-[10px] font-bold text-gray-400 mb-2 capitalize uppercase tracking-wider">{docKey.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative shadow-inner group-hover:border-orange-200 transition-colors">
                                                    {selectedItem.documents?.[docKey] ? (
                                                        <>
                                                            <img
                                                                src={getImageUrl(selectedItem.documents?.[docKey])}
                                                                alt={docKey}
                                                                className="w-full h-full object-contain bg-gray-50 transition-transform duration-500 group-hover:scale-105"
                                                                onError={(e: any) => {
                                                                    e.target.style.display = 'none';
                                                                    const parent = e.target.parentElement;
                                                                    if (parent && !parent.querySelector('.error-msg')) {
                                                                        const div = document.createElement('div');
                                                                        div.className = 'error-msg absolute inset-0 flex flex-col items-center justify-center text-red-400 bg-gray-50 p-4 text-center';
                                                                        div.innerHTML = `<svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><span class="text-[9px] font-bold">IMAGE NOT FOUND</span>`;
                                                                        parent.appendChild(div);
                                                                    }
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                                                            <a
                                                                href={getImageUrl(selectedItem.documents?.[docKey])}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-lg text-[9px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:bg-white"
                                                            >
                                                                <FaEye className="text-[9px]" /> Full View
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50/50">
                                                            <FaFileAlt className="text-lg mb-2 opacity-20" />
                                                            <span className="text-[9px] font-bold uppercase tracking-tighter">Not Uploaded</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Storefront Photo */}
                                {selectedItem.storefrontPhoto && (
                                    <div className="mb-6">
                                        <h4 className="text-md font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Storefront</h4>
                                        <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative max-w-md">
                                            <img
                                                src={getImageUrl(selectedItem.storefrontPhoto)}
                                                alt="Storefront"
                                                className="w-full h-full object-cover"
                                                onError={(e: any) => {
                                                    e.target.src = 'https://via.placeholder.com/400x225?text=Storefront+Not+Found';
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Menu Photos */}
                                {selectedItem.menuPhotos && selectedItem.menuPhotos.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-md font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Menu Photos</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {selectedItem.menuPhotos.map((photo: string, index: number) => (
                                                <div key={index} className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative group">
                                                    <img
                                                        src={getImageUrl(photo)}
                                                        alt={`Menu ${index + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        onError={(e: any) => {
                                                            e.target.src = 'https://via.placeholder.com/400x400?text=Menu+Not+Found';
                                                        }}
                                                    />
                                                    <a
                                                        href={getImageUrl(photo)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-lg text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <FaEye />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!Object.values(selectedItem.documents || {}).some(Boolean) && !selectedItem.storefrontPhoto && (!selectedItem.menuPhotos || selectedItem.menuPhotos.length === 0) && (
                                    <div className="col-span-full py-12 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <FaFileAlt className="text-4xl text-gray-300 mb-3" />
                                        <p className="text-gray-500 font-medium">No documents uploaded</p>
                                    </div>
                                )}

                                <div className="bg-gray-50 p-4 rounded-xl mb-6">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Rejection Reason (Optional)</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                        placeholder="If rejecting, please specify why..."
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex gap-4 bg-white">
                                <button
                                    onClick={() => handleAction(selectedItem._id, 'approve', selectedItem.name ? 'restaurant' : 'rider')}
                                    disabled={processing}
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {processing ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                    Approve Application
                                </button>
                                <button
                                    onClick={() => handleAction(selectedItem._id, 'reject', selectedItem.name ? 'restaurant' : 'rider')}
                                    disabled={processing}
                                    className="flex-1 py-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {processing ? <FaSpinner className="animate-spin" /> : <FaTimesCircle />}
                                    Reject Application
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
