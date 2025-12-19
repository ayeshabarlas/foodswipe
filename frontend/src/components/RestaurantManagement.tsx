'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaEdit,
    FaTrash,
    FaPlus,
    FaSave,
    FaTimes,
    FaImage,
    FaVideo,
    FaUtensils,
    FaStore
} from 'react-icons/fa';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../utils/config';

interface Dish {
    _id: string;
    name: string;
    description: string;
    price: number;
    videoUrl: string;
    imageUrl: string;
    category: string;
}

interface Restaurant {
    _id: string;
    name: string;
    address: string;
    contact: string;
    logo: string;
    description: string;
}

export default function RestaurantManagement() {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editingDish, setEditingDish] = useState<Dish | null>(null);
    const [showAddDish, setShowAddDish] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        videoUrl: '',
        imageUrl: '',
        category: 'Desi',
    });

    useEffect(() => {
        fetchRestaurantData();
    }, []);

    const fetchRestaurantData = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            // Fetch restaurant owned by this user
            const restaurantRes = await axios.get(
                `${API_BASE_URL}/api/restaurants/my-restaurant`,
                config
            );
            setRestaurant(restaurantRes.data);

            // Fetch dishes for this restaurant
            const dishesRes = await axios.get(
                `${API_BASE_URL}/api/dishes/restaurant/${restaurantRes.data._id}`
            );
            setDishes(dishesRes.data);
        } catch (error) {
            console.error('Error fetching restaurant data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDish = async (dishId: string) => {
        if (!confirm('Are you sure you want to delete this dish?')) return;

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            await axios.delete(`${API_BASE_URL}/api/dishes/${dishId}`, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });
            fetchRestaurantData();
        } catch (error) {
            console.error('Error deleting dish:', error);
        }
    };

    const handleEditDish = (dish: Dish) => {
        setEditingDish(dish);
        setFormData({
            name: dish.name,
            description: dish.description,
            price: dish.price,
            videoUrl: dish.videoUrl,
            imageUrl: dish.imageUrl,
            category: dish.category,
        });
        setShowAddDish(true);
    };

    const handleSaveDish = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            if (editingDish) {
                // Update existing dish
                await axios.put(
                    `${API_BASE_URL}/api/dishes/${editingDish._id}`,
                    formData,
                    config
                );
            } else {
                // Create new dish
                await axios.post(
                    `${API_BASE_URL}/api/dishes`,
                    { ...formData, restaurant: restaurant?._id },
                    config
                );
            }

            setShowAddDish(false);
            setEditingDish(null);
            setFormData({
                name: '',
                description: '',
                price: 0,
                videoUrl: '',
                imageUrl: '',
                category: 'Desi',
            });
            fetchRestaurantData();
        } catch (error) {
            console.error('Error saving dish:', error);
        }
    };

    const handleDeleteRestaurant = async () => {
        if (!confirm('Are you sure you want to delete your restaurant? This action cannot be undone.')) return;

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            await axios.delete(`${API_BASE_URL}/api/restaurants/${restaurant?._id}`, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });
            router.push('/');
        } catch (error) {
            console.error('Error deleting restaurant:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-accent p-6 shadow-lg">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-black flex items-center gap-3">
                        <FaStore />
                        Restaurant Management
                    </h1>
                    <p className="text-black/70 text-sm">Manage your restaurant profile and menu</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Restaurant Info */}
                <div className="bg-gray-800 rounded-xl p-6 mb-8 shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <img
                                src={restaurant?.logo || '/placeholder-logo.png'}
                                alt={restaurant?.name}
                                className="w-20 h-20 rounded-full object-cover border-4 border-primary"
                            />
                            <div>
                                <h2 className="text-2xl font-bold">{restaurant?.name}</h2>
                                <p className="text-gray-400">{restaurant?.address}</p>
                                <p className="text-gray-500 text-sm">{restaurant?.contact}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                            >
                                <FaEdit />
                                Edit Profile
                            </button>
                            <button
                                onClick={handleDeleteRestaurant}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                            >
                                <FaTrash />
                                Delete
                            </button>
                        </div>
                    </div>
                    <p className="text-gray-300">{restaurant?.description}</p>
                </div>

                {/* Menu Management */}
                <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <FaUtensils className="text-primary" />
                            Menu Items ({dishes.length})
                        </h2>
                        <button
                            onClick={() => {
                                setEditingDish(null);
                                setFormData({
                                    name: '',
                                    description: '',
                                    price: 0,
                                    videoUrl: '',
                                    imageUrl: '',
                                    category: 'Desi',
                                });
                                setShowAddDish(true);
                            }}
                            className="flex items-center gap-2 bg-primary hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                        >
                            <FaPlus />
                            Add New Dish
                        </button>
                    </div>

                    {/* Dishes Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dishes.map((dish) => (
                            <motion.div
                                key={dish._id}
                                whileHover={{ scale: 1.02 }}
                                className="bg-gray-700 rounded-lg overflow-hidden shadow-lg"
                            >
                                <div className="relative h-48">
                                    <img
                                        src={dish.imageUrl}
                                        alt={dish.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button
                                            onClick={() => handleEditDish(dish)}
                                            className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition"
                                        >
                                            <FaEdit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDish(dish._id)}
                                            className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg mb-1">{dish.name}</h3>
                                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">{dish.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-primary font-bold">Rs. {dish.price}</span>
                                        <span className="text-xs bg-gray-600 px-2 py-1 rounded">{dish.category}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add/Edit Dish Modal */}
            <AnimatePresence>
                {showAddDish && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setShowAddDish(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold">
                                    {editingDish ? 'Edit Dish' : 'Add New Dish'}
                                </h3>
                                <button
                                    onClick={() => setShowAddDish(false)}
                                    className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSaveDish} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Dish Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary"
                                        rows={3}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Price (Rs.)</label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                            className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="Desi">Desi</option>
                                            <option value="BBQ">BBQ</option>
                                            <option value="Chinese">Chinese</option>
                                            <option value="Continental">Continental</option>
                                            <option value="Rice">Rice</option>
                                            <option value="Breads">Breads</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        <FaImage /> Image URL
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="https://example.com/image.jpg"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        <FaVideo /> Video URL
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.videoUrl}
                                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                        className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="https://example.com/video.mp4"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-red-600 text-white font-bold py-3 rounded-lg transition"
                                >
                                    <FaSave />
                                    {editingDish ? 'Update Dish' : 'Add Dish'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
