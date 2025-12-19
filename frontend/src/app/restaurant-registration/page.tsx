'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/config';
import { FaUpload, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function RestaurantRegistration() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [uploading, setUploading] = useState(false);
    interface FormData {
        name: string;
        address: string;
        contact: string;
        description: string;
        ownerCNIC: string;
        businessType: string;
        cuisineTypes: string[];
        documents: {
            cnicFront: string;
            cnicBack: string;
            license: string;
            menu: string;
        };
        kitchenPhotos: string[];
        sampleDishPhotos: string[];
        storefrontPhoto: string;
        menuPhotos: string[];
        bankDetails: {
            accountType: string;
            accountHolderName: string;
            accountNumber: string;
            bankName: string;
            iban: string;
        };
    }

    const [formData, setFormData] = useState<FormData>({
        name: '',
        address: '',
        contact: '',
        description: '',
        ownerCNIC: '',
        businessType: 'restaurant',
        cuisineTypes: [],
        documents: {
            cnicFront: '',
            cnicBack: '',
            license: '',
            menu: ''
        },
        kitchenPhotos: [],
        sampleDishPhotos: [],
        storefrontPhoto: '',
        menuPhotos: [],
        bankDetails: {
            accountType: 'bank',
            accountHolderName: '',
            accountNumber: '',
            bankName: '',
            iban: ''
        }
    });

    const cuisineOptions = ['Pakistani', 'Chinese', 'Fast Food', 'Italian', 'Continental', 'Desserts', 'Beverages'];

    const handleFileUpload = async (file: File, field: string, isArray = false) => {
        const uploadData = new FormData();
        uploadData.append('file', file);

        setUploading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            const { data } = await axios.post(`${API_BASE_URL}/api/upload`, uploadData, config);
            const fullUrl = `${API_BASE_URL}${data.imageUrl}`;

            if (isArray) {
                const keys = field.split('.');
                if (keys.length === 1) {
                    setFormData(prev => ({
                        ...prev,
                        [field]: [...(prev[field as keyof typeof prev] as string[]), fullUrl]
                    }));
                }
            } else {
                const keys = field.split('.');
                if (keys.length === 2) {
                    setFormData(prev => ({
                        ...prev,
                        [keys[0]]: {
                            ...(prev[keys[0] as keyof typeof prev] as any),
                            [keys[1]]: fullUrl
                        }
                    }));
                } else {
                    setFormData(prev => ({ ...prev, [field]: fullUrl }));
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            // Update verification status to pending
            const submitData = {
                ...formData,
                verificationStatus: 'pending'
            };

            await axios.post(`${API_BASE_URL}/api/restaurants`, submitData, config);
            alert('Registration submitted! Your application is pending admin approval.');
            router.push('/restaurant-dashboard');
        } catch (error: any) {
            console.error('Registration error:', error);
            alert(error.response?.data?.message || 'Failed to submit registration');
        }
    };

    const FileUploadBox = ({ label, field, required = false, accept = "image/*", isArray = false }: any) => {
        const getValue = () => {
            const keys = field.split('.');
            if (keys.length === 2) {
                return (formData[keys[0] as keyof typeof formData] as any)?.[keys[1]];
            }
            return formData[field as keyof typeof formData];
        };

        const value = getValue();
        const hasFile = isArray ? (value as string[])?.length > 0 : !!value;

        return (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-500 transition">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center justify-between">
                    <input
                        type="file"
                        accept={accept}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, field, isArray);
                        }}
                        className="hidden"
                        id={field}
                    />
                    <label
                        htmlFor={field}
                        className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                        <FaUpload /> Choose File
                    </label>
                    {hasFile && (
                        <FaCheckCircle className="text-green-500 text-2xl" />
                    )}
                </div>
                {hasFile && !isArray && (
                    <img src={value as string} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />
                )}
                {isArray && (value as string[])?.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                        {(value as string[]).map((url, idx) => (
                            <img key={idx} src={url} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurant Registration</h1>
                <p className="text-gray-600 mb-8">Complete all steps to submit your application for approval</p>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                    {['Basic Info', 'Documents', 'Photos', 'Bank Details'].map((label, idx) => (
                        <div key={idx} className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step > idx + 1 ? 'bg-green-500 text-white' : step === idx + 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {step > idx + 1 ? '✓' : idx + 1}
                            </div>
                            <span className="ml-2 text-sm font-medium hidden sm:block">{label}</span>
                            {idx < 3 && <div className="w-12 h-1 bg-gray-200 mx-2" />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                rows={3}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                                <input
                                    type="tel"
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Owner CNIC *</label>
                                <input
                                    type="text"
                                    value={formData.ownerCNIC}
                                    onChange={(e) => setFormData({ ...formData, ownerCNIC: e.target.value })}
                                    placeholder="12345-1234567-1"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
                            <select
                                value={formData.businessType}
                                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            >
                                <option value="restaurant">Restaurant</option>
                                <option value="home-chef">Home Chef</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine Types *</label>
                            <div className="grid grid-cols-3 gap-2">
                                {cuisineOptions.map((cuisine) => (
                                    <label key={cuisine} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.cuisineTypes.includes(cuisine)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({ ...formData, cuisineTypes: [...formData.cuisineTypes, cuisine] });
                                                } else {
                                                    setFormData({ ...formData, cuisineTypes: formData.cuisineTypes.filter(c => c !== cuisine) });
                                                }
                                            }}
                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{cuisine}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                rows={3}
                                placeholder="Tell us about your restaurant..."
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Documents */}
                {step === 2 && (
                    <div className="space-y-4">
                        <FileUploadBox label="CNIC Front" field="documents.cnicFront" required />
                        <FileUploadBox label="CNIC Back" field="documents.cnicBack" required />
                        <FileUploadBox label="Business License / NTN Certificate" field="documents.license" required />
                        <FileUploadBox label="Menu (Optional)" field="documents.menu" />
                    </div>
                )}

                {/* Step 3: Photos */}
                {step === 3 && (
                    <div className="space-y-4">
                        <FileUploadBox label="Storefront Photo" field="storefrontPhoto" required />
                        <FileUploadBox label="Kitchen Photos (Upload multiple)" field="kitchenPhotos" isArray />
                        <FileUploadBox label="Sample Dish Photos (Upload multiple)" field="sampleDishPhotos" isArray />
                        <FileUploadBox label="Menu Photos (Upload multiple)" field="menuPhotos" isArray />
                    </div>
                )}

                {/* Step 4: Bank Details */}
                {step === 4 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
                            <select
                                value={formData.bankDetails.accountType}
                                onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountType: e.target.value } })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            >
                                <option value="bank">Bank Account</option>
                                <option value="jazzcash">JazzCash</option>
                                <option value="easypaisa">EasyPaisa</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name *</label>
                            <input
                                type="text"
                                value={formData.bankDetails.accountHolderName}
                                onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountHolderName: e.target.value } })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
                            <input
                                type="text"
                                value={formData.bankDetails.accountNumber}
                                onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                required
                            />
                        </div>
                        {formData.bankDetails.accountType === 'bank' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                                    <input
                                        type="text"
                                        value={formData.bankDetails.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                                    <input
                                        type="text"
                                        value={formData.bankDetails.iban}
                                        onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, iban: e.target.value } })}
                                        placeholder="PK36XXXX0000001234567890"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                        >
                            Previous
                        </button>
                    )}
                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="ml-auto px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={uploading}
                            className="ml-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition font-bold disabled:opacity-50"
                        >
                            {uploading ? 'Uploading...' : 'Submit Application'}
                        </button>
                    )}
                </div>

                {uploading && (
                    <div className="mt-4 text-center text-orange-600 font-medium animate-pulse">
                        Uploading files... Please wait.
                    </div>
                )}
            </div>
        </div>
    );
}
