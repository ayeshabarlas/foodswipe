'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaEye, FaSpinner } from 'react-icons/fa';

export default function AdminVerifications() {
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
            alert('Failed to load verifications');
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

            alert(`${type === 'restaurant' ? 'Restaurant' : 'Rider'} ${action}ed successfully!`);
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

    const RestaurantCard = ({ restaurant }: any) => (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{restaurant.name}</h3>
                    <p className="text-sm text-gray-600">{restaurant.owner?.email}</p>
                    <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${restaurant.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {restaurant.verificationStatus}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="text-sm">
                    <span className="font-medium">Type:</span> {restaurant.businessType}
                </div>
                <div className="text-sm">
                    <span className="font-medium">Contact:</span> {restaurant.contact}
                </div>
                <div className="text-sm">
                    <span className="font-medium">CNIC:</span> {restaurant.ownerCNIC || 'Not provided'}
                </div>
            </div>

            <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Documents:</p>
                <div className="grid grid-cols-2 gap-2">
                    {restaurant.documents?.cnicFront && (
                        <div className="flex items-center gap-2 text-sm">
                            <FaCheckCircle className="text-green-500" />
                            <span>CNIC Front</span>
                        </div>
                    )}
                    {restaurant.documents?.cnicBack && (
                        <div className="flex items-center gap-2 text-sm">
                            <FaCheckCircle className="text-green-500" />
                            <span>CNIC Back</span>
                        </div>
                    )}
                    {restaurant.documents?.license && (
                        <div className="flex items-center gap-2 text-sm">
                            <FaCheckCircle className="text-green-500" />
                            <span>License</span>
                        </div>
                    )}
                    {!restaurant.documents?.cnicFront && !restaurant.documents?.cnicBack && !restaurant.documents?.license && (
                        <div className="col-span-2 text-sm text-red-500">No documents uploaded</div>
                    )}
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setSelectedItem(restaurant)}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2"
                >
                    <FaEye /> View Details
                </button>
                <button
                    onClick={() => handleAction(restaurant._id, 'approve', 'restaurant')}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FaCheckCircle /> Approve
                </button>
                <button
                    onClick={() => {
                        setSelectedItem(restaurant);
                        setRejectionReason('');
                    }}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FaTimesCircle /> Reject
                </button>
            </div>
        </div>
    );

    const RiderCard = ({ rider }: any) => (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{rider.fullName}</h3>
                    <p className="text-sm text-gray-600">{rider.user?.email}</p>
                    <p className="text-sm text-gray-500 mt-1">CNIC: {rider.cnicNumber}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${rider.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {rider.verificationStatus}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="text-sm">
                    <span className="font-medium">Vehicle:</span> {rider.vehicleType}
                </div>
                <div className="text-sm">
                    <span className="font-medium">City:</span> {rider.city}
                </div>
            </div>

            <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Documents:</p>
                <div className="grid grid-cols-2 gap-2">
                    {rider.documents?.cnicFront && (
                        <div className="flex items-center gap-2 text-sm">
                            <FaCheckCircle className="text-green-500" />
                            <span>CNIC Front</span>
                        </div>
                    )}
                    {rider.documents?.drivingLicense && (
                        <div className="flex items-center gap-2 text-sm">
                            <FaCheckCircle className="text-green-500" />
                            <span>License</span>
                        </div>
                    )}
                    {!rider.documents?.cnicFront && !rider.documents?.drivingLicense && (
                        <div className="col-span-2 text-sm text-red-500">No documents uploaded</div>
                    )}
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setSelectedItem(rider)}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2"
                >
                    <FaEye /> View Details
                </button>
                <button
                    onClick={() => handleAction(rider._id, 'approve', 'rider')}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FaCheckCircle /> Approve
                </button>
                <button
                    onClick={() => {
                        setSelectedItem(rider);
                        setRejectionReason('');
                    }}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FaTimesCircle /> Reject
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Verification Management</h1>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('restaurants')}
                        className={`px-6 py-3 rounded-lg font-medium transition ${activeTab === 'restaurants'
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        Restaurants ({restaurants.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('riders')}
                        className={`px-6 py-3 rounded-lg font-medium transition ${activeTab === 'riders'
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        Riders ({riders.length})
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <FaSpinner className="animate-spin text-4xl text-orange-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeTab === 'restaurants' ? (
                            restaurants.length > 0 ? (
                                restaurants.map((restaurant) => (
                                    <RestaurantCard key={restaurant._id} restaurant={restaurant} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 text-gray-500">
                                    No pending restaurant verifications
                                </div>
                            )
                        ) : (
                            riders.length > 0 ? (
                                riders.map((rider) => (
                                    <RiderCard key={rider._id} rider={rider} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 text-gray-500">
                                    No pending rider verifications
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Document Viewer Modal */}
                {selectedItem && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {selectedItem.name || selectedItem.fullName}
                                    </h2>
                                    <p className="text-gray-600">{selectedItem.owner?.email || selectedItem.user?.email}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Documents Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {selectedItem.documents?.cnicFront && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">CNIC Front</p>
                                        <img src={selectedItem.documents.cnicFront} alt="CNIC Front" className="w-full h-48 object-cover rounded-lg border" />
                                    </div>
                                )}
                                {selectedItem.documents?.cnicBack && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">CNIC Back</p>
                                        <img src={selectedItem.documents.cnicBack} alt="CNIC Back" className="w-full h-48 object-cover rounded-lg border" />
                                    </div>
                                )}
                                {selectedItem.documents?.license && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Business License</p>
                                        <img src={selectedItem.documents.license} alt="License" className="w-full h-48 object-cover rounded-lg border" />
                                    </div>
                                )}
                                {selectedItem.documents?.drivingLicense && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Driving License</p>
                                        <img src={selectedItem.documents.drivingLicense} alt="Driving License" className="w-full h-48 object-cover rounded-lg border" />
                                    </div>
                                )}
                            </div>

                            {/* Rejection Reason Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rejection Reason (if rejecting)
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    rows={3}
                                    placeholder="Provide a reason for rejection..."
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleAction(
                                        selectedItem._id,
                                        'approve',
                                        selectedItem.name ? 'restaurant' : 'rider'
                                    )}
                                    disabled={processing}
                                    className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleAction(
                                        selectedItem._id,
                                        'reject',
                                        selectedItem.name ? 'restaurant' : 'rider'
                                    )}
                                    disabled={processing}
                                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing ? <FaSpinner className="animate-spin" /> : <FaTimesCircle />}
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
