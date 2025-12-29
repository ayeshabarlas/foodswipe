'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { FaStore, FaUtensils, FaArrowLeft, FaCloudUploadAlt, FaTrash, FaPlus, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { API_BASE_URL } from '../utils/config';

interface CreateRestaurantProps {
    onRestaurantCreated: () => void;
}

export default function CreateRestaurant({ onRestaurantCreated }: CreateRestaurantProps) {
    const [step, setStep] = useState<'selection' | 'form'>('selection');
    const [businessType, setBusinessType] = useState<'home-chef' | 'restaurant'>('restaurant');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

    const [formData, setFormData] = useState({
        restaurantName: '',
        ownerFullName: '',
        phone: '',
        email: '',
        address: '',
        taxNumber: '',
        cnicFront: '',
        cnicBack: '',
        license: '',
        storefrontPhoto: '',
        kitchenPhotos: [] as string[],
        menuPhotos: [] as string[],
        sampleDishPhotos: [] as string[],
        accountTitle: '',
        bankName: '',
        iban: '',
        logo: '',
        foodCategory: '',
        description: '',
    });

    const formatPhoneNumber = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const limitedDigits = digits.slice(0, 10);
        if (limitedDigits.length <= 3) return limitedDigits;
        if (limitedDigits.length <= 6) return `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3)}`;
        return `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3, 6)} ${limitedDigits.slice(6)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, isArray: boolean = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(prev => ({ ...prev, [field]: true }));
        setError('');

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const data = new FormData();
                data.append('file', file);
                const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
                const res = await axios.post(`${API_BASE_URL}/api/upload`, data, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });
                return `${API_BASE_URL}${res.data.imageUrl}`;
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            if (isArray) {
                setFormData(prev => ({
                    ...prev,
                    [field]: [...(prev[field as keyof typeof prev] as string[]), ...uploadedUrls]
                }));
            } else {
                setFormData(prev => ({ ...prev, [field]: uploadedUrls[0] }));
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload image. Please try again.');
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    const removePhoto = (field: string, index: number) => {
        setFormData(prev => ({
            ...prev,
            [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userInfo = localStorage.getItem("userInfo");
            if (!userInfo) {
                setError('Session expired. Please login again.');
                setTimeout(() => {
                    localStorage.clear();
                    window.location.reload();
                }, 2000);
                return;
            }

            const token = JSON.parse(userInfo).token;
            if (!token) {
                setError('Authentication token missing. Please login again.');
                setTimeout(() => {
                    localStorage.clear();
                    window.location.reload();
                }, 2000);
                return;
            }

            const fullContact = `+92${formData.phone.replace(/\s/g, '')}`;

            const payload = {
                name: businessType === 'restaurant' ? formData.restaurantName : formData.ownerFullName,
                address: formData.address,
                contact: fullContact,
                description: formData.description,
                businessType,
                taxNumber: formData.taxNumber,
                documents: {
                    cnicFront: formData.cnicFront,
                    cnicBack: formData.cnicBack,
                    license: formData.license,
                },
                storefrontPhoto: formData.storefrontPhoto,
                kitchenPhotos: formData.kitchenPhotos,
                menuPhotos: formData.menuPhotos,
                sampleDishPhotos: formData.sampleDishPhotos,
                logo: formData.logo,
                bankDetails: {
                    accountHolderName: formData.accountTitle,
                    bankName: formData.bankName,
                    iban: formData.iban,
                },
                cuisineTypes: formData.foodCategory ? [formData.foodCategory] : [],
                location: { type: 'Point', coordinates: [0, 0] },
                verificationStatus: 'pending',
            };

            await axios.post(`${API_BASE_URL}/api/restaurants/create`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onRestaurantCreated();
        } catch (err: any) {
            console.error('Creation error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to create profile');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        window.location.reload();
    };

    if (step === 'selection') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <button
                        onClick={handleBackToLogin}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-normal transition"
                    >
                        <FaArrowLeft size={14} /> Back to Login
                    </button>

                    <div className="bg-gradient-to-r from-orange-500 to-red-600 p-10 rounded-t-3xl text-white text-center">
                        <h2 className="text-3xl font-bold mb-2">Create Your Food Business Profile</h2>
                        <p className="opacity-95 font-light">Select your business type to get started</p>
                    </div>

                    <div className="bg-white p-8 rounded-b-3xl shadow-xl">
                        <div className="space-y-4">
                            <div
                                onClick={() => setBusinessType('home-chef')}
                                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${businessType === 'home-chef' ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center shrink-0 ${businessType === 'home-chef' ? 'border-orange-500' : 'border-gray-300'}`}>
                                    {businessType === 'home-chef' && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                                </div>
                                <div className="p-3 bg-orange-50 rounded-xl text-orange-600 shrink-0">
                                    <FaUtensils size={22} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">Home Chef</h3>
                                    <p className="text-gray-600 text-sm mb-3 font-light">Home-based kitchen, no license required</p>
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">No License Needed</span>
                                        <span className="bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full">Quick Setup</span>
                                    </div>
                                </div>
                            </div>

                            <div
                                onClick={() => setBusinessType('restaurant')}
                                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${businessType === 'restaurant' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center shrink-0 ${businessType === 'restaurant' ? 'border-orange-500' : 'border-gray-300'}`}>
                                    {businessType === 'restaurant' && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                                    <FaStore size={22} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">Restaurant Owner</h3>
                                    <p className="text-gray-600 text-sm mb-3 font-light">Physical restaurant, license required</p>
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full">License Required</span>
                                        <span className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full">Verified Business</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('form')}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-4 rounded-2xl mt-8 transition shadow-md"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto p-4 md:p-6 pb-20">
                <button onClick={() => setStep('selection')} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-normal transition">
                    <FaArrowLeft size={14} /> Back to selection
                </button>

                <div className="flex items-center gap-4 mb-8 bg-white p-5 rounded-2xl shadow-sm">
                    <div className={`p-3 rounded-xl ${businessType === 'home-chef' ? 'bg-orange-500' : 'bg-orange-600'} text-white`}>
                        {businessType === 'home-chef' ? <FaUtensils size={22} /> : <FaStore size={22} />}
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                            {businessType === 'home-chef' ? 'Home Chef Profile' : 'Restaurant Owner Profile'}
                        </h1>
                        <p className="text-gray-500 text-sm font-light mt-0.5">
                            {businessType === 'home-chef' ? 'License required • Verified business' : 'License required • Verified business'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Business Information */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">Business Information</h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {businessType === 'restaurant' ? 'Restaurant Name' : 'Full Name'} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={businessType === 'restaurant' ? formData.restaurantName : formData.ownerFullName}
                                    onChange={(e) => setFormData({ ...formData, [businessType === 'restaurant' ? 'restaurantName' : 'ownerFullName']: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-light"
                                    placeholder={businessType === 'restaurant' ? 'Enter restaurant name' : 'Enter your full name'}
                                />
                            </div>

                            {businessType === 'restaurant' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Owner Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.ownerFullName}
                                        onChange={(e) => setFormData({ ...formData, ownerFullName: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-light"
                                        placeholder="Enter owner's full name"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-light">+92</span>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={handlePhoneChange}
                                        className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-light"
                                        placeholder="300 1234567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-light"
                                    placeholder="restaurant@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {businessType === 'restaurant' ? 'Business Address' : 'Home Address (Pickup Location)'} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition resize-none h-24 text-sm font-light"
                                    placeholder="Enter complete business address"
                                />
                            </div>

                            {businessType === 'restaurant' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tax Number / NTN
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.taxNumber}
                                        onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-light"
                                        placeholder="Optional but recommended"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CNIC Documents */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">CNIC Documents</h3>
                            <p className="text-sm text-gray-500 font-light mt-1">Required for verification</p>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    CNIC Front <span className="text-red-500">*</span>
                                </label>
                                <UploadBox
                                    label="Upload CNIC Front"
                                    required
                                    value={formData.cnicFront}
                                    uploading={uploading['cnicFront']}
                                    onUpload={(e) => handleFileUpload(e, 'cnicFront')}
                                    onRemove={() => setFormData({ ...formData, cnicFront: '' })}
                                    description="Click to browse or drag & drop"
                                    subDescription="PDF, JPG, PNG (Max 2MB)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    CNIC Back <span className="text-red-500">*</span>
                                </label>
                                <UploadBox
                                    label="Upload CNIC Back"
                                    required
                                    value={formData.cnicBack}
                                    uploading={uploading['cnicBack']}
                                    onUpload={(e) => handleFileUpload(e, 'cnicBack')}
                                    onRemove={() => setFormData({ ...formData, cnicBack: '' })}
                                    description="Click to browse or drag & drop"
                                    subDescription="PDF, JPG, PNG (Max 2MB)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Restaurant License (Restaurant Owner Only) */}
                    {businessType === 'restaurant' && (
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-orange-200">
                            <div className="bg-orange-500 text-white px-6 py-3.5 flex items-center gap-2">
                                <FaExclamationTriangle size={16} />
                                <h3 className="font-semibold">Restaurant License</h3>
                                <span className="ml-auto text-xs bg-white text-orange-600 px-2.5 py-1 rounded-full font-medium">Mandatory for restaurant verification</span>
                            </div>

                            <div className="p-6">
                                <UploadBox
                                    label="Upload Restaurant License"
                                    required
                                    value={formData.license}
                                    uploading={uploading['license']}
                                    onUpload={(e) => handleFileUpload(e, 'license')}
                                    onRemove={() => setFormData({ ...formData, license: '' })}
                                    description="Click to browse or drag & drop"
                                    subDescription="PDF, JPG, PNG (Max 10MB)"
                                />
                            </div>
                        </div>
                    )}

                    {/* Restaurant Photos */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">{businessType === 'restaurant' ? 'Restaurant Photos' : 'Kitchen Photos'}</h3>
                        </div>

                        <div className="p-6 space-y-6">
                            {businessType === 'restaurant' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Storefront Photo <span className="text-red-500">*</span>
                                    </label>
                                    <UploadBox
                                        label="Upload storefront photo"
                                        required
                                        value={formData.storefrontPhoto}
                                        uploading={uploading['storefrontPhoto']}
                                        onUpload={(e) => handleFileUpload(e, 'storefrontPhoto')}
                                        onRemove={() => setFormData({ ...formData, storefrontPhoto: '' })}
                                        description="Click to browse or drag & drop"
                                        subDescription="PDF, JPG, PNG (Max 10MB)"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kitchen Photos <span className="text-red-500">*</span>
                                </label>
                                <p className="text-sm text-blue-600 mb-3 font-light">Upload 2 clear photos of your kitchen</p>
                                <PhotoGrid
                                    photos={formData.kitchenPhotos}
                                    maxPhotos={2}
                                    uploading={uploading['kitchenPhotos']}
                                    onUpload={(e) => handleFileUpload(e, 'kitchenPhotos', true)}
                                    onRemove={(index) => removePhoto('kitchenPhotos', index)}
                                />
                            </div>

                            {businessType === 'restaurant' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Menu Photos <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-sm text-blue-600 mb-3 font-light">Upload menu photos or digital menu</p>
                                    <PhotoGrid
                                        photos={formData.menuPhotos}
                                        maxPhotos={5}
                                        uploading={uploading['menuPhotos']}
                                        onUpload={(e) => handleFileUpload(e, 'menuPhotos', true)}
                                        onRemove={(index) => removePhoto('menuPhotos', index)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">Bank Details</h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Account Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.accountTitle}
                                    onChange={(e) => setFormData({ ...formData, accountTitle: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-light"
                                    placeholder="Account holder name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Bank Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-light"
                                    placeholder="e.g. HBL, UBL, MCB"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    IBAN <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.iban}
                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition uppercase text-sm font-light"
                                    placeholder="PK12ABCD0000001234567890"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Optional Information */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">Optional Information</h3>
                            <p className="text-sm text-gray-500 font-light mt-1">Stand out from the competition</p>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    {businessType === 'restaurant' ? 'Restaurant Logo' : 'Your Logo'}
                                </label>
                                <UploadBox
                                    label="Upload your logo"
                                    value={formData.logo}
                                    uploading={uploading['logo']}
                                    onUpload={(e) => handleFileUpload(e, 'logo')}
                                    onRemove={() => setFormData({ ...formData, logo: '' })}
                                    description="Click to browse or drag & drop"
                                    subDescription="PDF, JPG, PNG (Max 10MB)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Food Category
                                </label>
                                <select
                                    value={formData.foodCategory}
                                    onChange={(e) => setFormData({ ...formData, foodCategory: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition bg-white text-sm font-light"
                                >
                                    <option value="">Select category</option>
                                    <option value="Pakistani">Pakistani</option>
                                    <option value="Chinese">Chinese</option>
                                    <option value="Fast Food">Fast Food</option>
                                    <option value="Italian">Italian</option>
                                    <option value="Desserts">Desserts</option>
                                    <option value="BBQ">BBQ</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {businessType === 'restaurant' ? 'Restaurant Description' : 'About Your Kitchen'}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition resize-none h-32 text-sm font-light"
                                    placeholder={businessType === 'restaurant'
                                        ? "Tell customers about your restaurant, cuisine, and what makes you special..."
                                        : "Tell customers about your cooking style, specialties, and experience..."}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Success Message */}
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
                        <div className="bg-green-500 rounded-full p-1 shrink-0">
                            <FaCheckCircle className="text-white text-base" />
                        </div>
                        <div>
                            <p className="text-green-800 text-sm leading-relaxed font-light">
                                After submission, you'll receive <span className="font-semibold">Verified {businessType === 'home-chef' ? 'Home Chef' : 'Restaurant'}</span> status upon approval
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-light">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-4 rounded-2xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting...' : 'Submit Profile for Review'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Upload Box Component
function UploadBox({
    label,
    required = false,
    value,
    uploading,
    onUpload,
    onRemove,
    description,
    subDescription
}: {
    label: string;
    required?: boolean;
    value: string;
    uploading: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    description: string;
    subDescription: string;
}) {
    return (
        <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 p-6 text-center hover:bg-gray-100 hover:border-gray-300 transition relative group">
            {value ? (
                <div className="relative">
                    <img src={value} alt={label} className="max-h-32 mx-auto rounded-lg" />
                    <button
                        type="button"
                        onClick={onRemove}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                        <FaTrash size={12} />
                    </button>
                </div>
            ) : (
                <label className="cursor-pointer block">
                    <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        {uploading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        ) : (
                            <FaCloudUploadAlt size={22} />
                        )}
                    </div>
                    <span className="block text-sm font-medium text-gray-700 mb-1">
                        {label} {required && <span className="text-red-500">*</span>}
                    </span>
                    <span className="block text-xs text-gray-600 mb-1 font-light">{description}</span>
                    <span className="block text-xs text-gray-400 font-light">{subDescription}</span>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={onUpload} />
                </label>
            )}
        </div>
    );
}

// Photo Grid Component
function PhotoGrid({
    photos,
    maxPhotos,
    uploading,
    onUpload,
    onRemove
}: {
    photos: string[];
    maxPhotos: number;
    uploading: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
}) {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                        <FaTrash size={10} />
                    </button>
                </div>
            ))}

            {photos.length < maxPhotos && (
                <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition">
                    {uploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    ) : (
                        <>
                            <FaPlus className="text-gray-400 mb-1" size={14} />
                            <span className="text-xs text-gray-500 font-normal">Add Photo</span>
                            <span className="text-[10px] text-gray-400 mt-1 font-light">{photos.length}/{maxPhotos}</span>
                        </>
                    )}
                    <input type="file" className="hidden" accept="image/*" multiple onChange={onUpload} />
                </label>
            )}
        </div>
    );
}
