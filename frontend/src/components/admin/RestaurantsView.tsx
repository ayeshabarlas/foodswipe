
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaMapMarkerAlt, FaFileImage, FaEye, FaSearch, FaFilter, FaStar, FaStore, FaClock, FaDollarSign } from 'react-icons/fa';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../utils/config';
import { getImageUrl } from '../../utils/imageUtils';

interface Restaurant {
    _id: string;
    name: string;
    owner: { _id: string; name: string; email: string; status: string };
    address: string;
    contact: string;
    logo: string;
    verificationStatus: string;
    isActive: boolean;
    rating: number;
    totalOrders: number;
    revenue: number;
    documents?: {
        logo?: string;
        cnicFront?: string;
        cnicBack?: string;
        businessLicense?: string;
    };
    bankDetails?: {
        accountType: string;
        accountHolderName: string;
        accountNumber: string;
        bankName: string;
        branchCode: string;
        iban: string;
        phoneNumber: string;
    };
}

export default function RestaurantsView() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'online' | 'offline'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

    useEffect(() => {
        fetchRestaurants();

        // Socket.io connection
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('Connected to socket for restaurant updates');
        });

        socket.on('restaurant_registered', (newRestaurant) => {
            console.log('New restaurant registered:', newRestaurant);
            fetchRestaurants();
        });

        socket.on('restaurant_updated', () => {
            console.log('Restaurant updated, refreshing...');
            fetchRestaurants();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchRestaurants = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;

            if (!token) return;

            const res = await axios.get(`${API_BASE_URL}/api/admin/restaurants`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            // Handle if data is wrapped in an object or is the array directly
            const restaurantList = Array.isArray(data) ? data : (Array.isArray(data.restaurants) ? data.restaurants : []);

            console.log('Fetched restaurants:', restaurantList);
            setRestaurants(restaurantList);
        } catch (error) {
            console.error('Error fetching restaurants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/restaurants/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
        } catch (error) {
            console.error('Error approving restaurant:', error);
        }
    };

    const handleReject = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/restaurants/${id}/reject`, { reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
        } catch (error) {
            console.error('Error rejecting restaurant:', error);
        }
    };

    const handleSuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to suspend this user?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/suspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
        } catch (error) {
            console.error('Error suspending user:', error);
        }
    };

    const handleUnsuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(`${API_BASE_URL}/api/admin/users/${id}/unsuspend`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
        } catch (error) {
            console.error('Error unsuspending user:', error);
        }
    };

    const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('WARNING: This will permanently delete the user and their restaurant. Proceed?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.delete(`${API_BASE_URL}/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRestaurants();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const stats = {
        total: restaurants?.length || 0,
        online: Array.isArray(restaurants) ? restaurants.filter(r => r.isActive && r.verificationStatus === 'approved').length : 0,
        pending: Array.isArray(restaurants) ? restaurants.filter(r => r.verificationStatus === 'pending').length : 0,
        commission: Array.isArray(restaurants) ? restaurants.reduce((acc, curr) => acc + (curr.revenue * 0.1), 0) : 0
    };

    const filteredRestaurants = Array.isArray(restaurants) ? restaurants.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.owner?.name.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = true;
        if (filter === 'pending') matchesFilter = r.verificationStatus === 'pending';
        if (filter === 'online') matchesFilter = r.isActive && r.verificationStatus === 'approved';
        if (filter === 'offline') matchesFilter = !r.isActive || r.verificationStatus !== 'approved';

        return matchesSearch && matchesFilter;
    }) : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Restaurants Management</h2>
                    <p className="text-gray-500">Manage all restaurants and their operations</p>
                </div>
                <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold transition flex items-center gap-2 shadow-lg shadow-orange-200">
                    <FaStore /> + Add Restaurant
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Total Restaurants</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-500">
                        <FaCheckCircle className="text-xl" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Online Now</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.online}</h3>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl text-green-500">
                        <FaCheckCircle className="text-xl" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Pending Approval</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.pending}</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl text-orange-500">
                        <FaClock className="text-xl" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-sm mb-1">Total Commission</p>
                        <h3 className="text-2xl font-bold text-gray-800">Rs {stats.commission.toLocaleString()}</h3>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl text-purple-500">
                        <FaDollarSign className="text-xl" />
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
                <div className="relative flex-1 max-w-lg">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by restaurant or owner name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-gray-600 bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="online">Online</option>
                        <option value="pending">Pending</option>
                        <option value="offline">Offline</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                        <FaFilter /> More Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Restaurant</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Owner</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Rating</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Orders</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Revenue</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Commission (10%)</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Pending Payout</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRestaurants.map((restaurant) => (
                                <tr
                                    key={restaurant._id}
                                    className="hover:bg-gray-50 transition cursor-pointer"
                                    onClick={() => setSelectedRestaurant(restaurant)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {restaurant.logo ? (
                                                <img src={getImageUrl(restaurant.logo)} alt={restaurant.name} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                                    {restaurant.name?.charAt(0) || 'R'}
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <p className="font-bold text-gray-800">{restaurant.name}</p>
                                                <p className="text-xs text-gray-500">{restaurant.contact}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="font-medium text-gray-800">{restaurant.owner?.name}</p>
                                            <p className="text-xs text-gray-500">{restaurant.owner?.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {restaurant.verificationStatus === 'pending' ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Pending
                                            </span>
                                        ) : restaurant.isActive && restaurant.verificationStatus === 'approved' ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div> Online
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                                                <div className="w-2 h-2 rounded-full bg-gray-400"></div> Offline
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                                            <FaStar className="text-yellow-400" />
                                            {restaurant.rating?.toFixed(1) || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{restaurant.totalOrders || 0}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">Rs {(restaurant.revenue || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                                        Rs {(Math.round((restaurant.revenue || 0) * 0.1)).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-orange-600">
                                        Rs {(Math.round((restaurant.revenue || 0) * 0.9)).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {restaurant.verificationStatus === 'pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => handleApprove(restaurant._id, e)}
                                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                                    title="Approve"
                                                >
                                                    <FaCheckCircle />
                                                </button>
                                                <button
                                                    onClick={(e) => handleReject(restaurant._id, e)}
                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                    title="Reject"
                                                >
                                                    <FaTimesCircle />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                {restaurant.owner?.status === 'suspended' ? (
                                                    <button
                                                        onClick={(e) => handleUnsuspend(restaurant.owner?._id, e)}
                                                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                                        title="Unsuspend User"
                                                    >
                                                        <FaCheckCircle />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => handleSuspend(restaurant.owner?._id, e)}
                                                        className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200"
                                                        title="Suspend User"
                                                    >
                                                        <FaTimesCircle />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDeleteUser(restaurant.owner?._id, e)}
                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                    title="Delete User & Restaurant"
                                                >
                                                    <FaTimesCircle className="transform rotate-45" />
                                                </button>
                                                <button className="text-gray-400 hover:text-orange-500 p-2">
                                                    <FaEye />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Document Modal */}
            {selectedRestaurant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRestaurant(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Reuse the existing document modal content here, simplified for brevity as it was quite long in previous version.
                            Ideally extracted to a separate component. For now, I will keep the header and basic info.
                        */}
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">{selectedRestaurant.name}</h3>
                                <div className="text-sm text-gray-500 mt-1 flex gap-4">
                                    <span>{selectedRestaurant.contact}</span>
                                    <span>•</span>
                                    <span>{selectedRestaurant.address}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRestaurant(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <FaTimesCircle className="text-2xl text-gray-400" />
                            </button>
                        </div>

                        {/* Document Grid - Reusing logic from previous version */}
                        {selectedRestaurant.documents ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(selectedRestaurant.documents).map(([key, value]) => (
                                    value && (
                                        <div key={key} className="border rounded-lg p-2">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                            <img src={getImageUrl(value)} alt={key} className="w-full h-32 object-cover rounded" />
                                        </div>
                                    )
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">No documents available</div>
                        )}

                        {/* Bank Details Section */}
                        {selectedRestaurant.bankDetails && (
                            <div className="mt-6 border-t pt-6">
                                <h4 className="text-lg font-bold text-gray-800 mb-4">Bank Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Account Type</p>
                                        <p className="text-gray-900 capitalize">{selectedRestaurant.bankDetails.accountType || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Account Holder</p>
                                        <p className="text-gray-900">{selectedRestaurant.bankDetails.accountHolderName || 'N/A'}</p>
                                    </div>
                                    {selectedRestaurant.bankDetails.accountType === 'bank' ? (
                                        <>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold">Bank Name</p>
                                                <p className="text-gray-900">{selectedRestaurant.bankDetails.bankName || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold">Account Number</p>
                                                <p className="text-gray-900">{selectedRestaurant.bankDetails.accountNumber || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold">IBAN</p>
                                                <p className="text-gray-900">{selectedRestaurant.bankDetails.iban || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold">Branch Code</p>
                                                <p className="text-gray-900">{selectedRestaurant.bankDetails.branchCode || 'N/A'}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Mobile Number</p>
                                            <p className="text-gray-900">{selectedRestaurant.bankDetails.phoneNumber || 'N/A'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons for Pending */}
                        {selectedRestaurant.verificationStatus === 'pending' && (
                            <div className="flex gap-3 pt-6 mt-6 border-t">
                                <button
                                    onClick={(e) => handleApprove(selectedRestaurant._id, e)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                                >
                                    <FaCheckCircle /> Approve
                                </button>
                                <button
                                    onClick={(e) => handleReject(selectedRestaurant._id, e)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                                >
                                    <FaTimesCircle /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}
