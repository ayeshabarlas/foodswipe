'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaEye, FaSpinner, FaStore, FaMotorcycle, FaFileAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function VerificationsView() {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [riders, setRiders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('restaurants');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchVerifications();
    }, []);

    const fetchVerifications = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };

            const [restaurantsRes, ridersRes] = await Promise.all([
                axios.get('http://localhost:5000/api/verifications/restaurants', config),
                axios.get('http://localhost:5000/api/verifications/riders', config)
            ]);

            setRestaurants(restaurantsRes.data);
            setRiders(ridersRes.data);
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
                ? `http://localhost:5000/api/verifications/restaurants/${id}`
                : `http://localhost:5000/api/verifications/riders/${id}`;

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
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${type === 'restaurant' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {type === 'restaurant' ? <FaStore className="text-xl" /> : <FaMotorcycle className="text-xl" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{item.name || item.fullName}</h3>
                        <p className="text-xs text-gray-500">{item.owner?.email || item.user?.email}</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    Pending
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
                <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="block text-xs text-gray-400">Type</span>
                    <span className="font-medium capitalize">{item.businessType || 'Rider'}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="block text-xs text-gray-400">Contact</span>
                    <span className="font-medium">{item.contact || item.user?.phone}</span>
                </div>
            </div>

            <button
                onClick={() => setSelectedItem(item)}
                className="w-full py-2.5 border-2 border-orange-500 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition flex items-center justify-center gap-2"
            >
                <FaEye /> Review Documents
            </button>
        </motion.div>
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Pending Approvals</h2>
                    <p className="text-gray-500">Review and verify new registrations</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200">
                    <button
                        onClick={() => setActiveTab('restaurants')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'restaurants'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Restaurants ({restaurants.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('riders')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'riders'
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Riders ({riders.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <FaSpinner className="animate-spin text-4xl text-orange-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTab === 'restaurants' ? (
                        restaurants.length > 0 ? (
                            restaurants.map(r => <Card key={r._id} item={r} type="restaurant" />)
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400">
                                <FaCheckCircle className="text-5xl mb-4 text-gray-200" />
                                <p>No pending restaurant verifications</p>
                            </div>
                        )
                    ) : (
                        riders.length > 0 ? (
                            riders.map(r => <Card key={r._id} item={r} type="rider" />)
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400">
                                <FaCheckCircle className="text-5xl mb-4 text-gray-200" />
                                <p>No pending rider verifications</p>
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
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{selectedItem.name || selectedItem.fullName}</h3>
                                    <p className="text-sm text-gray-500">Verification Request</p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 rounded-full transition">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Official Documents */}
                                <div className="mb-6">
                                    <h4 className="text-md font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Official Documents</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {['cnicFront', 'cnicBack', 'license'].map((docKey) => (
                                            selectedItem.documents?.[docKey] && (
                                                <div key={docKey} className="group relative">
                                                    <p className="text-sm font-bold text-gray-700 mb-2 capitalize">{docKey.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                    <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
                                                        <img
                                                            src={selectedItem.documents[docKey]?.startsWith('http')
                                                                ? selectedItem.documents[docKey]
                                                                : `http://localhost:5000/${selectedItem.documents[docKey]}`}
                                                            alt={docKey}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                        <a
                                                            href={selectedItem.documents[docKey]?.startsWith('http')
                                                                ? selectedItem.documents[docKey]
                                                                : `http://localhost:5000/${selectedItem.documents[docKey]}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-lg text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            View Full Size
                                                        </a>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>

                                {/* Storefront Photo */}
                                {selectedItem.storefrontPhoto && (
                                    <div className="mb-6">
                                        <h4 className="text-md font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Storefront</h4>
                                        <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative max-w-md">
                                            <img
                                                src={selectedItem.storefrontPhoto.startsWith('http')
                                                    ? selectedItem.storefrontPhoto
                                                    : `http://localhost:5000/${selectedItem.storefrontPhoto}`}
                                                alt="Storefront"
                                                className="w-full h-full object-cover"
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
                                                        src={photo.startsWith('http') ? photo : `http://localhost:5000/${photo}`}
                                                        alt={`Menu ${index + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                    <a
                                                        href={photo.startsWith('http') ? photo : `http://localhost:5000/${photo}`}
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
