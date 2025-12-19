'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FaPlus, FaEdit, FaTrash, FaImage,
    FaExclamationTriangle, FaSearch
} from 'react-icons/fa';
import AddDishModal from './AddDishModal';
import axios from 'axios';
import { getImageUrl } from '../utils/imageUtils';
import { API_BASE_URL } from '../utils/config';

interface Dish {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    videoUrl: string;
    ingredients: string[]

    ;
    stockQuantity: number;
    lowStockThreshold: number;
    isAvailable: boolean;
    restaurant: string;
}

export default function DashboardMenu() {
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editingDish, setEditingDish] = useState<Dish | null>(null);
    const [restaurant, setRestaurant] = useState<any>(null);

    const fetchDishes = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) return;
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const restaurantRes = await axios.get(`${API_BASE_URL}/api/restaurants/my-restaurant`, config);
            setRestaurant(restaurantRes.data);

            const response = await axios.get(`${API_BASE_URL}/api/dishes/my-dishes`, config);
            setDishes(response.data);
        } catch (error) {
            console.error('Error fetching dishes:', error);
        }
    };

    useEffect(() => {
        fetchDishes();
    }, []);

    const handleModalSubmit = async (data: any) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const restaurantRes = await axios.get(`${API_BASE_URL}/api/restaurants/my-restaurant`, config);

            const payload = {
                ...data,
                restaurant: restaurantRes.data._id,
            };

            if (editingDish) {
                await axios.put(`${API_BASE_URL}/api/dishes/${editingDish._id}`, payload, config);
            } else {
                await axios.post(`${API_BASE_URL}/api/dishes`, payload, config);
            }

            setShowModal(false);
            setEditingDish(null);
            fetchDishes();
        } catch (error: any) {
            console.error('Error saving dish:', error);
            alert(error.response?.data?.message || 'Failed to save dish');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this dish?')) return;

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            await axios.delete(`${API_BASE_URL}/api/dishes/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchDishes();
        } catch (error) {
            console.error('Error deleting dish:', error);
        }
    };

    const openEditModal = (dish: Dish) => {
        setEditingDish(dish);
        setShowModal(true);
    };

    const filteredDishes = dishes.filter(dish => {
        const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || dish.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', 'Desi', 'Fast Food', 'Chinese', 'Italian', 'Dessert', 'Beverages'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search dishes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <button
                    onClick={() => {
                        if (restaurant?.verificationStatus !== 'approved') {
                            alert(`Note: Restaurant status is currently '${restaurant?.verificationStatus || 'unknown'}'. Changes might not be visible until approved.`);
                        }
                        setEditingDish(null);
                        setShowModal(true);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg"
                >
                    <FaPlus /> Add New Dish
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDishes.map((dish) => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={dish._id}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group"
                    >
                        <div className="relative h-48 bg-gray-100">
                            {dish.imageUrl ? (
                                <img src={getImageUrl(dish.imageUrl)} alt={dish.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                    <FaImage className="text-4xl opacity-50" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(dish)} className="p-2 bg-white text-blue-500 rounded-full shadow-lg hover:bg-blue-50">
                                    <FaEdit />
                                </button>
                                <button onClick={() => handleDelete(dish._id)} className="p-2 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-50">
                                    <FaTrash />
                                </button>
                            </div>
                            {dish.stockQuantity !== null && dish.stockQuantity <= dish.lowStockThreshold && (
                                <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    <FaExclamationTriangle /> Low Stock: {dish.stockQuantity}
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-900 line-clamp-1">{dish.name}</h3>
                                <span className="text-orange-600 font-bold">Rs. {dish.price}</span>
                            </div>
                            <p className="text-gray-500 text-sm line-clamp-2 mb-3">{dish.description}</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">{dish.category}</span>
                                {dish.ingredients?.length > 0 && (
                                    <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-md">{dish.ingredients.length} Ingredients</span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AddDishModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingDish(null);
                }}
                onSubmit={handleModalSubmit}
                editingDish={editingDish}
            />
        </div >
    );
}
