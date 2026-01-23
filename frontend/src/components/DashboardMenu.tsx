'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FaPlus, FaEdit, FaTrash, FaImage,
    FaExclamationTriangle, FaSearch, FaFolderPlus
} from 'react-icons/fa';
import AddDishModal from './AddDishModal';
import axios from 'axios';
import { getImageUrl, getImageFallback } from '../utils/imageUtils';
import { getApiUrl } from '../utils/config';

interface Dish {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    videoUrl: string;
    ingredients: string[];
    stockQuantity: number;
    lowStockThreshold: number;
    isAvailable: boolean;
    restaurant: string;
}

export default function DashboardMenu({ restaurant: initialRestaurant }: { restaurant?: any }) {
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editingDish, setEditingDish] = useState<Dish | null>(null);
    const [restaurant, setRestaurant] = useState<any>(initialRestaurant || null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('userInfo');
            if (saved) setUserInfo(JSON.parse(saved));
        }
    }, []);

    const fetchDishes = async () => {
        try {
            if (!userInfo?.token) {
                console.warn('DashboardMenu: No auth token found');
                return;
            }
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            // If we don't have initial restaurant, fetch it
            const [restaurantRes, dishesRes] = await Promise.all([
                !initialRestaurant ? axios.get(`${getApiUrl()}/api/restaurants/my-restaurant`, config) : Promise.resolve({ data: initialRestaurant }),
                axios.get(`${getApiUrl()}/api/dishes/my-dishes`, config)
            ]);

            if (restaurantRes.data) {
                setRestaurant(restaurantRes.data);
            }

            if (Array.isArray(dishesRes.data)) {
                console.log(`DashboardMenu: Fetched ${dishesRes.data.length} dishes`);
                setDishes(dishesRes.data);
            }
        } catch (error: any) {
            console.error('DashboardMenu: Error fetching data:', error.response?.data || error.message);
        }
    };

    useEffect(() => {
        if (userInfo) {
            fetchDishes();
        }
    }, [userInfo]);

    const handleModalSubmit = async (data: any) => {
        try {
            if (!userInfo?.token) return alert('Please login again');
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const restaurantRes = await axios.get(`${getApiUrl()}/api/restaurants/my-restaurant`, config);

            const payload = {
                ...data,
                restaurant: restaurantRes.data._id,
            };

            if (editingDish) {
                const res = await axios.put(`${getApiUrl()}/api/dishes/${editingDish._id}`, payload, config);
                setDishes(dishes.map(d => d._id === editingDish._id ? res.data : d));
            } else {
                const res = await axios.post(`${getApiUrl()}/api/dishes`, payload, config);
                setDishes([res.data, ...dishes]);
            }

            setShowModal(false);
            setEditingDish(null);
            // Optional: call fetchDishes to ensure everything is synced with server
            fetchDishes();
        } catch (error: any) {
            console.error('Error saving dish:', error);
            alert(error.response?.data?.message || 'Failed to save dish');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this dish?')) return;

        try {
            if (!userInfo?.token) return alert('Please login again');
            await axios.delete(`${getApiUrl()}/api/dishes/${id}`, {
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

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            if (!userInfo?.token) return;
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            const currentCategories = restaurant?.menuCategories || [];
            
            if (currentCategories.includes(newCategoryName.trim())) {
                alert('Category already exists');
                return;
            }

            const updatedCategories = [...currentCategories, newCategoryName.trim()];
            const res = await axios.put(`${getApiUrl()}/api/restaurants/categories`, {
                categories: updatedCategories
            }, config);

            setRestaurant({ ...restaurant, menuCategories: res.data.categories });
            setNewCategoryName('');
            setShowAddCategory(false);
        } catch (error) {
            console.error('Error adding category:', error);
            alert('Failed to add category');
        }
    };

    const handleDeleteCategory = async (catToDelete: string) => {
        if (!confirm(`Are you sure you want to delete the category "${catToDelete}"? Dishes in this category will still exist but won't be assigned to this category.`)) return;
        try {
            if (!userInfo?.token) return;
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            const updatedCategories = (restaurant?.menuCategories || []).filter((c: string) => c !== catToDelete);
            
            const res = await axios.put(`${getApiUrl()}/api/restaurants/categories`, {
                categories: updatedCategories
            }, config);

            setRestaurant({ ...restaurant, menuCategories: res.data.categories });
            if (categoryFilter === catToDelete) setCategoryFilter('All');
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Failed to delete category');
        }
    };

    const filteredDishes = dishes.filter(dish => {
        const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || dish.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const dishCategories = [...new Set(dishes.map(d => d.category))];
    const definedCategories = restaurant?.menuCategories || [];
    const allCategories = [...new Set([...definedCategories, ...dishCategories])];
    const categories = ['All', ...allCategories];

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 min-w-[200px] sm:w-64">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search dishes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        {categoryFilter !== 'All' && (
                            <button
                                onClick={() => handleDeleteCategory(categoryFilter)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Delete this category"
                            >
                                <FaTrash />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {showAddCategory ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto bg-gray-50 p-1 rounded-lg border border-gray-200">
                            <input
                                type="text"
                                placeholder="Category name..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="px-3 py-1.5 bg-transparent outline-none text-sm w-full sm:w-32"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                            />
                            <button
                                onClick={handleAddCategory}
                                className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm font-bold hover:bg-green-600 transition"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowAddCategory(false)}
                                className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddCategory(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition bg-orange-100 text-orange-600 hover:bg-orange-200"
                        >
                            <FaFolderPlus /> Add Category
                        </button>
                    )}
                    
                    <button
                        onClick={() => {
                            if (restaurant?.verificationStatus !== 'approved') {
                                alert(`Note: Restaurant status is currently '${restaurant?.verificationStatus || 'unknown'}'. Changes might not be visible until approved.`);
                            }
                            setEditingDish(null);
                            setShowModal(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg shadow-orange-500/20"
                    >
                        <FaPlus /> Add Dish
                    </button>
                </div>
            </div>

            {/* Dishes Grouped by Category */}
            <div className="space-y-12">
                {categories.filter(cat => cat !== 'All' && (categoryFilter === 'All' || categoryFilter === cat)).map(category => {
                    const categoryDishes = filteredDishes.filter(d => d.category === category);
                    if (categoryDishes.length === 0 && categoryFilter !== category) return null;

                    return (
                        <div key={category} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-bold text-gray-800">{category}</h2>
                                <div className="h-[1px] flex-1 bg-gray-200"></div>
                                <span className="text-sm text-gray-400 font-medium">{categoryDishes.length} Items</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {categoryDishes.length === 0 ? (
                                    <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                                        <FaImage className="mx-auto text-gray-200 text-4xl mb-3" />
                                        <p className="text-gray-400 text-sm">No dishes in this category yet</p>
                                    </div>
                                ) : (
                                    categoryDishes.map((dish) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            key={dish._id}
                                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group"
                                        >
                                            <div className="relative h-48 bg-gray-100">
                                                <img
                                                    src={getImageUrl(dish.imageUrl)}
                                                    alt={dish.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = getImageFallback('dish');
                                                    }}
                                                />
                                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEditModal(dish)}
                                                        className="p-2 bg-white text-blue-500 rounded-full shadow-lg hover:bg-blue-50 transition-colors"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(dish._id)}
                                                        className="p-2 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-50 transition-colors"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                                {dish.stockQuantity !== null && dish.stockQuantity <= dish.lowStockThreshold && (
                                                    <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                                        <FaExclamationTriangle /> LOW STOCK: {dish.stockQuantity}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-gray-900 line-clamp-1">{dish.name}</h3>
                                                    <span className="text-orange-600 font-bold text-sm whitespace-nowrap">Rs. {dish.price}</span>
                                                </div>
                                                <p className="text-gray-500 text-xs line-clamp-2 mb-4 h-8">{dish.description}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-md tracking-wider">{dish.category}</span>
                                                    {dish.ingredients?.length > 0 && (
                                                        <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase rounded-md tracking-wider">
                                                            {dish.ingredients.length} Ingredients
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}

                {filteredDishes.length === 0 && categoryFilter === 'All' && (
                    <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                        <FaImage className="mx-auto text-gray-200 text-5xl mb-4" />
                        <p className="text-gray-400 font-medium">No dishes found. Add some dishes to your menu!</p>
                    </div>
                )}
            </div>

            <AddDishModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingDish(null);
                }}
                onSubmit={handleModalSubmit}
                editingDish={editingDish}
                categories={allCategories}
            />
        </div>
    );
}

