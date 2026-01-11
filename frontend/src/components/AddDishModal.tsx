'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/config';
import { getImageUrl } from '@/utils/imageUtils';
import ModernLoader from './ModernLoader';

interface Variant {
    name: string;
    price: number;
}

interface AddOn {
    name: string;
    price: number;
}

interface Drink {
    name: string;
    size: string;
    price: number;
}

interface Combo {
    title: string;
    items: string;
    price: number;
}

interface AddDishModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    editingDish?: any;
}

export default function AddDishModal({ isOpen, onClose, onSubmit, editingDish }: AddDishModalProps) {
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        category: 'Desi',
        ingredients: '',
        imageUrl: '',
        videoUrl: '',
    });

    // Update form when editingDish changes
    useEffect(() => {
        if (editingDish) {
            setFormData({
                name: editingDish.name || '',
                description: editingDish.description || '',
                price: editingDish.price || 0,
                category: editingDish.category || 'Desi',
                ingredients: editingDish.ingredients?.join(', ') || '',
                imageUrl: editingDish.imageUrl || '',
                videoUrl: editingDish.videoUrl || '',
            });
            setVariants(editingDish.variants || []);
            setAddOns(editingDish.addOns || []);
            setDrinks(editingDish.drinks || []);
            setCombos(editingDish.combos || []);
        } else {
            // Reset form for new dish
            setFormData({
                name: '',
                description: '',
                price: 0,
                category: 'Desi',
                ingredients: '',
                imageUrl: '',
                videoUrl: '',
            });
            setVariants([]);
            setAddOns([]);
            setDrinks([]);
            setCombos([]);
        }
    }, [editingDish]);

    const [variants, setVariants] = useState<Variant[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [combos, setCombos] = useState<Combo[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'videoUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        setUploading(true);
        setUploadProgress(0);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const token = userInfo.token;
            
            if (!token) {
                alert('Session expired. Please login again.');
                return;
            }

            // Check file size (100MB limit for videos, 10MB for images)
            const maxSize = field === 'videoUrl' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
            if (file.size > maxSize) {
                alert(`File is too large. Max size is ${field === 'videoUrl' ? '100MB' : '10MB'}`);
                return;
            }

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
                onUploadProgress: (progressEvent: any) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            };

            const { data } = await axios.post(`${API_BASE_URL}/api/upload`, uploadData, config);
            
            const uploadedPath = data.videoUrl || data.imageUrl;
            if (uploadedPath) {
                setFormData(prev => ({ ...prev, [field]: uploadedPath }));
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error: any) {
            console.error('File upload error:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to upload file';
            alert(`Upload Error: ${msg}`);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const tabs = ['Basic Info', 'Variants', 'Add-ons', 'Drinks', 'Combos', 'Media'];
    const categories = ['Desi', 'Fast Food', 'Chinese', 'Italian', 'Dessert', 'Beverages'];

    const addVariant = () => setVariants([...variants, { name: '', price: 0 }]);
    const removeVariant = (index: number) => setVariants(variants.filter((_, i) => i !== index));

    const addAddOn = () => setAddOns([...addOns, { name: '', price: 0 }]);
    const removeAddOn = (index: number) => setAddOns(addOns.filter((_, i) => i !== index));

    const addDrink = () => setDrinks([...drinks, { name: '', size: '345ml', price: 0 }]);
    const removeDrink = (index: number) => setDrinks(drinks.filter((_, i) => i !== index));

    const addCombo = () => setCombos([...combos, { title: '', items: '', price: 0 }]);
    const removeCombo = (index: number) => setCombos(combos.filter((_, i) => i !== index));

    const stripBaseUrl = (url: string) => {
        if (!url) return '';
        
        // Normalize slashes
        let cleanPath = url.replace(/\\/g, '/');
        
        // If it's a Firebase/GCS URL or already a full URL that isn't our API, keep it
        if (cleanPath.startsWith('http')) {
            // Only strip if it's our own API's uploads folder
            const uploadsIndex = cleanPath.indexOf('/uploads/');
            if (uploadsIndex !== -1 && (cleanPath.includes(API_BASE_URL) || !cleanPath.includes('storage.googleapis.com'))) {
                cleanPath = cleanPath.substring(uploadsIndex + 9); // Skip '/uploads/'
            } else {
                // Keep full URL (e.g. Firebase)
                return cleanPath;
            }
        }
        
        // Remove any leading slashes or 'uploads/' prefix for local paths
        let oldPath;
        do {
            oldPath = cleanPath;
            cleanPath = cleanPath.replace(/^(\.\/|\.\.\/|\/|uploads\/)+/, '');
        } while (cleanPath !== oldPath);
        
        return cleanPath;
    };

    const handleSubmitForm = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.imageUrl) {
            alert('Please upload a dish image');
            return;
        }

        onSubmit({
            ...formData,
            imageUrl: stripBaseUrl(formData.imageUrl),
            videoUrl: stripBaseUrl(formData.videoUrl),
            variants,
            addOns,
            drinks,
            combos,
            ingredients: formData.ingredients.split(',').map((i: string) => i.trim()).filter((i: string) => i),
        });
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{editingDish ? 'Edit Dish' : 'Add New Dish'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6 flex gap-2 overflow-x-auto">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(index)}
                            className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition ${activeTab === index
                                ? 'text-orange-600 border-b-2 border-orange-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6">
                    {/* Tab 0: Basic Info */}
                    {activeTab === 0 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dish Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (Rs.) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                >
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe your dish..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients (comma separated)</label>
                                <textarea
                                    rows={2}
                                    value={formData.ingredients}
                                    onChange={e => setFormData({ ...formData, ingredients: e.target.value })}
                                    placeholder="e.g. Chicken, Rice, Spices"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab 1: Variants */}
                    {activeTab === 1 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600">Add size variants (Small, Medium, Large, etc.)</p>
                                <button
                                    type="button"
                                    onClick={addVariant}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                >
                                    <FaPlus /> Add Variant
                                </button>
                            </div>
                            {variants.map((variant, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-end border border-gray-200 p-4 rounded-lg">
                                    <div className="col-span-5">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Size Name</label>
                                        <input
                                            type="text"
                                            value={variant.name}
                                            onChange={e => {
                                                const updated = [...variants];
                                                updated[index].name = e.target.value;
                                                setVariants(updated);
                                            }}
                                            placeholder="e.g. Small"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs.)</label>
                                        <input
                                            type="number"
                                            value={variant.price}
                                            onChange={e => {
                                                const updated = [...variants];
                                                updated[index].price = Number(e.target.value);
                                                setVariants(updated);
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <button
                                            type="button"
                                            onClick={() => removeVariant(index)}
                                            className="w-full p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {variants.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <p>No variants added. Click "Add Variant" to create size options.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Add-ons */}
                    {activeTab === 2 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600">Add-ons like Extra Cheese, Extra Sauce, etc.</p>
                                <button
                                    type="button"
                                    onClick={addAddOn}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                >
                                    <FaPlus /> Add Add-on
                                </button>
                            </div>
                            {addOns.map((addon, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-end border border-gray-200 p-4 rounded-lg">
                                    <div className="col-span-8">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Add-on Name</label>
                                        <input
                                            type="text"
                                            value={addon.name}
                                            onChange={e => {
                                                const updated = [...addOns];
                                                updated[index].name = e.target.value;
                                                setAddOns(updated);
                                            }}
                                            placeholder="e.g. Extra Cheese"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs.)</label>
                                        <input
                                            type="number"
                                            value={addon.price}
                                            onChange={e => {
                                                const updated = [...addOns];
                                                updated[index].price = Number(e.target.value);
                                                setAddOns(updated);
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <button
                                            type="button"
                                            onClick={() => removeAddOn(index)}
                                            className="w-full p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {addOns.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <p>No add-ons yet. Click "Add Add-on" to create optional extras.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Drinks */}
                    {activeTab === 3 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600">Beverages that can be added to this dish</p>
                                <button
                                    type="button"
                                    onClick={addDrink}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                >
                                    <FaPlus /> Add Drink
                                </button>
                            </div>
                            {drinks.map((drink, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-end border border-gray-200 p-4 rounded-lg">
                                    <div className="col-span-5">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Drink Name</label>
                                        <input
                                            type="text"
                                            value={drink.name}
                                            onChange={e => {
                                                const updated = [...drinks];
                                                updated[index].name = e.target.value;
                                                setDrinks(updated);
                                            }}
                                            placeholder="e.g. Pepsi"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                                        <input
                                            type="text"
                                            value={drink.size}
                                            onChange={e => {
                                                const updated = [...drinks];
                                                updated[index].size = e.target.value;
                                                setDrinks(updated);
                                            }}
                                            placeholder="345ml"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs.)</label>
                                        <input
                                            type="number"
                                            value={drink.price}
                                            onChange={e => {
                                                const updated = [...drinks];
                                                updated[index].price = Number(e.target.value);
                                                setDrinks(updated);
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <button
                                            type="button"
                                            onClick={() => removeDrink(index)}
                                            className="w-full p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {drinks.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <p>No drinks added. Click "Add Drink" to include beverage options.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 4: Combos */}
                    {activeTab === 4 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600">Meal combos (e.g. Burger + Fries + Drink)</p>
                                <button
                                    type="button"
                                    onClick={addCombo}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                >
                                    <FaPlus /> Add Combo
                                </button>
                            </div>
                            {combos.map((combo, index) => (
                                <div key={index} className="border border-gray-200 p-4 rounded-lg space-y-4">
                                    <div className="grid grid-cols-12 gap-4 items-end">
                                        <div className="col-span-8">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Combo Title</label>
                                            <input
                                                type="text"
                                                value={combo.title}
                                                onChange={e => {
                                                    const updated = [...combos];
                                                    updated[index].title = e.target.value;
                                                    setCombos(updated);
                                                }}
                                                placeholder="e.g. Family Meal"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs.)</label>
                                            <input
                                                type="number"
                                                value={combo.price}
                                                onChange={e => {
                                                    const updated = [...combos];
                                                    updated[index].price = Number(e.target.value);
                                                    setCombos(updated);
                                                }}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <button
                                                type="button"
                                                onClick={() => removeCombo(index)}
                                                className="w-full p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Included Items (comma separated)</label>
                                        <input
                                            type="text"
                                            value={combo.items}
                                            onChange={e => {
                                                const updated = [...combos];
                                                updated[index].items = e.target.value;
                                                setCombos(updated);
                                            }}
                                            placeholder="e.g. Burger, Fries, Drink"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                            ))}
                            {combos.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <p>No combos created. Click "Add Combo" to create meal deals.</p>
                                </div>
                            )}
                        </div>
                    )}





                    {/* Tab 5: Media */}
                    {activeTab === 5 && (
                        <div className="space-y-8">
                            {/* Image Upload */}
                            <div className="grid grid-cols-12 gap-6">
                                <div className="col-span-9">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Dish Image *</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="dish-image"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'imageUrl')}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="dish-image"
                                            className="flex items-center w-full px-2 py-2 border border-blue-100 rounded-xl cursor-pointer hover:bg-gray-50 transition"
                                        >
                                            <span className="bg-orange-50 text-orange-600 font-bold px-4 py-2 rounded-lg text-sm mr-4">
                                                Choose File
                                            </span>
                                            <span className="text-gray-600 text-sm truncate">
                                                {formData.imageUrl ? formData.imageUrl.split('/').pop() : 'No file chosen'}
                                            </span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Supported formats: JPG, PNG, JPEG (Max 10MB)</p>
                                </div>
                                <div className="col-span-3">
                                    <div className="w-full aspect-square bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden relative">
                                        {formData.imageUrl ? (
                                            <img src={getImageUrl(formData.imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-gray-300 flex flex-col items-center">
                                                <span className="text-xs text-gray-400 font-medium">Image Preview</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Video Upload */}
                            <div className="grid grid-cols-12 gap-6">
                                <div className="col-span-9">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Dish Video (Optional)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="dish-video"
                                            accept="video/*"
                                            onChange={(e) => handleFileUpload(e, 'videoUrl')}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                        <label
                                            htmlFor="dish-video"
                                            className={`flex items-center w-full px-2 py-2 border border-blue-100 rounded-xl cursor-pointer hover:bg-gray-50 transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="bg-orange-50 text-orange-600 font-bold px-4 py-2 rounded-lg text-sm mr-4">
                                                {uploading ? 'Uploading...' : 'Choose Video'}
                                            </span>
                                            <span className="text-gray-600 text-sm truncate">
                                                {formData.videoUrl ? formData.videoUrl.split('/').pop() : 'No video chosen'}
                                            </span>
                                        </label>
                                    </div>
                                    {uploading && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Uploading...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    className="h-full bg-orange-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">Supported formats: MP4, MOV, AVI (Max 100MB)</p>
                                </div>
                                <div className="col-span-3">
                                    <div className="w-full aspect-square bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden relative">
                                        {formData.videoUrl ? (
                                            <video 
                                                src={getImageUrl(formData.videoUrl)} 
                                                className="w-full h-full object-cover"
                                                controls
                                                muted
                                                playsInline
                                            />
                                        ) : (
                                            <div className="text-gray-300 flex flex-col items-center">
                                                <span className="text-xs text-gray-400 font-medium">Video Preview</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {uploading && (
                                <div className="flex items-center gap-3 text-orange-500 font-medium text-sm">
                                    <ModernLoader size="sm" />
                                    <span>Uploading media... {uploadProgress > 0 && `(${uploadProgress}%)`}</span>
                                </div>
                            )}
                        </div>
                    )}


                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex gap-2">
                        {activeTab > 0 && (
                            <button
                                type="button"
                                onClick={() => setActiveTab(activeTab - 1)}
                                className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                            >
                                Previous
                            </button>
                        )}
                        {activeTab < tabs.length - 1 && (
                            <button
                                type="button"
                                onClick={() => setActiveTab(activeTab + 1)}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition"
                            >
                                Next
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmitForm}
                            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg hover:shadow-lg transition flex items-center gap-2"
                        >
                            <FaSave /> Save Dish
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
