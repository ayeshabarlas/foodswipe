'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiUrl } from '../../utils/config';
import { getImageUrl } from '../../utils/imageUtils';
import { FaUpload, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaStore, FaUtensils, FaClock, FaExclamationCircle } from 'react-icons/fa';

export default function RestaurantRegistration() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    // Masking functions
    const maskCNIC = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 13);
        if (digits.length <= 5) return digits;
        if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
        return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
    };

    const maskPhone = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 4) return digits;
        return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    };
    interface RestaurantFormData {
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

    const [formData, setFormData] = useState<RestaurantFormData>({
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

        setUploadingField(field);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token || ''}`,
                },
            };

            const { data } = await axios.post(`${getApiUrl()}/api/upload`, uploadData, config);
            // In the restaurant-registration page, we want to show the full URL for preview
            // The backend's normalizePath will handle stripping it when we save to DB
            const path = data.imageUrl;

            if (isArray) {
                setFormData(prev => ({
                    ...prev,
                    [field]: [...(prev[field as keyof typeof prev] as string[]), path]
                }));
            } else {
                const keys = field.split('.');
                if (keys.length === 2) {
                    setFormData(prev => ({
                        ...prev,
                        [keys[0]]: {
                            ...(prev[keys[0] as keyof typeof prev] as any),
                            [keys[1]]: path
                        }
                    }));
                } else {
                    setFormData(prev => ({ ...prev, [field]: path }));
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file');
        } finally {
            setUploadingField(null);
        }
    };

    // Step validation
    const canGoNext = () => {
        if (step === 1) return !!formData.businessType;
        if (step === 2) return formData.name && formData.address && formData.contact && formData.ownerCNIC && formData.cuisineTypes.length > 0;
        if (step === 3) {
            const docs = formData.documents;
            if (formData.businessType === 'restaurant') {
                return !!(docs.cnicFront && docs.cnicBack && docs.license);
            }
            return !!(docs.cnicFront && docs.cnicBack); // License not required for Home Chef
        }
        if (step === 4) return !!(formData.storefrontPhoto && formData.kitchenPhotos.length > 0);
        if (step === 5) return !!(formData.bankDetails.accountHolderName && formData.bankDetails.accountNumber);
        return true;
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token || ''}`,
                },
            };

            // Update verification status to pending
            const submitData = {
                ...formData,
                verificationStatus: 'pending'
            };

            await axios.post(`${getApiUrl()}/api/restaurants/create`, submitData, config);
            alert('Registration submitted! Your application is pending admin approval.');
            router.push('/restaurant-dashboard');
        } catch (error: any) {
            console.error('Registration error:', error);
            alert(error.response?.data?.message || 'Failed to submit registration');
        } finally {
            setLoading(false);
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
        const isUploading = uploadingField === field;

        return (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-500 transition bg-white shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center justify-between gap-4">
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
                        className={`cursor-pointer flex items-center gap-2 px-6 py-2.5 ${isUploading ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-xl transition shadow-md font-medium text-sm`}
                    >
                        {isUploading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Uploading...
                            </>
                        ) : (
                            <>
                                <FaUpload /> {hasFile ? 'Change File' : 'Choose File'}
                            </>
                        )}
                    </label>
                    {hasFile && !isUploading && (
                        <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                            <FaCheckCircle className="text-xl" />
                            {isArray ? `${(value as string[]).length} files` : 'Uploaded'}
                        </div>
                    )}
                </div>

                {hasFile && !isUploading && (
                    <div className="mt-4 p-2 bg-gray-50 rounded-xl border border-gray-100">
                        {!isArray ? (
                            <div className="relative group w-fit">
                                <img 
                                    src={getImageUrl(value as string)} 
                                    alt="Preview" 
                                    className="w-40 h-40 object-cover rounded-lg shadow-sm border border-gray-200" 
                                    onError={(e: any) => {
                                        e.target.src = 'https://via.placeholder.com/150?text=Error+Loading+Image';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">Click Change File to replace</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3 flex-wrap">
                                {(value as string[]).map((url, idx) => (
                                    <div key={idx} className="relative group">
                                        <img 
                                            src={getImageUrl(url)} 
                                            alt={`Preview ${idx + 1}`} 
                                            className="w-24 h-24 object-cover rounded-lg shadow-sm border border-gray-200"
                                            onError={(e: any) => {
                                                e.target.src = 'https://via.placeholder.com/100?text=Error';
                                            }}
                                        />
                                        <button 
                                            onClick={() => {
                                                const newArr = (value as string[]).filter((_, i) => i !== idx);
                                                setFormData(prev => ({ ...prev, [field]: newArr }));
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <FaTimesCircle size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
                <button
                    onClick={() => router.push('/login')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition"
                >
                    <FaArrowLeft size={16} /> Back to Login
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurant Registration</h1>
                <p className="text-gray-600 mb-8">Complete all steps to submit your application for approval</p>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    {['Type', 'Info', 'Docs', 'Photos', 'Bank'].map((label, idx) => (
                        <div key={idx} className="flex items-center flex-shrink-0">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-base ${step > idx + 1 ? 'bg-green-500 text-white' : step === idx + 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {step > idx + 1 ? '✓' : idx + 1}
                            </div>
                            <span className={`ml-2 text-[10px] sm:text-sm font-medium ${step === idx + 1 ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>{label}</span>
                            {idx < 4 && <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${step > idx + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Selection (Business Type) */}
                {step === 1 && (
                    <div className="space-y-8 py-4">
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Choose Business Type</h2>
                            <p className="text-gray-500 text-sm">Select the category that best describes your business</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div 
                                onClick={() => {
                                    setFormData({ ...formData, businessType: 'restaurant' });
                                    setStep(2);
                                }}
                                className={`group p-8 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col items-center gap-5 hover:scale-[1.02] active:scale-95 ${formData.businessType === 'restaurant' ? 'border-orange-500 bg-orange-50 shadow-xl' : 'border-gray-100 hover:border-orange-200 bg-gray-50/50'}`}
                            >
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-transform group-hover:rotate-6 ${formData.businessType === 'restaurant' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                    <FaStore size={36} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-gray-900 mb-1">Restaurant</h3>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-[200px]">Physical outlet, commercial location, license required</p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${formData.businessType === 'restaurant' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    Select
                                </div>
                            </div>

                            <div 
                                onClick={() => {
                                    setFormData({ ...formData, businessType: 'home-chef' });
                                    setStep(2);
                                }}
                                className={`group p-8 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col items-center gap-5 hover:scale-[1.02] active:scale-95 ${formData.businessType === 'home-chef' ? 'border-orange-500 bg-orange-50 shadow-xl' : 'border-gray-100 hover:border-orange-200 bg-gray-50/50'}`}
                            >
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-transform group-hover:-rotate-6 ${formData.businessType === 'home-chef' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                    <FaUtensils size={36} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-gray-900 mb-1">Home Chef</h3>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-[200px]">Home-based kitchen, individual chef, no license required</p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${formData.businessType === 'home-chef' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    Select
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Basic Info */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                                    {formData.businessType === 'restaurant' ? <FaStore /> : <FaUtensils />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Selected Type</p>
                                    <p className="text-sm font-bold text-gray-900 capitalize">{formData.businessType?.replace('-', ' ')}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setStep(1)}
                                className="text-xs font-bold text-orange-600 hover:underline"
                            >
                                Change Type
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    {formData.businessType === 'restaurant' ? 'Restaurant Name *' : 'Kitchen Name *'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-medium placeholder:text-gray-400 bg-gray-50/50"
                                    placeholder={formData.businessType === 'restaurant' ? "e.g. KFC, Pizza Hut" : "e.g. Ammi's Kitchen"}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    {formData.businessType === 'restaurant' ? 'Restaurant Address *' : 'Home Address *'}
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-medium placeholder:text-gray-400 bg-gray-50/50"
                                    rows={3}
                                    placeholder="Enter complete address for pickup"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">Contact Number *</label>
                                    <input
                                        type="tel"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: maskPhone(e.target.value) })}
                                        placeholder="0300-1234567"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-medium placeholder:text-gray-400 bg-gray-50/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">Owner CNIC *</label>
                                    <input
                                        type="text"
                                        value={formData.ownerCNIC}
                                        onChange={(e) => setFormData({ ...formData, ownerCNIC: maskCNIC(e.target.value) })}
                                        placeholder="12345-1234567-1"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-medium placeholder:text-gray-400 bg-gray-50/50"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Cuisine Types (Select at least one) *</label>
                                <div className="flex flex-wrap gap-2">
                                    {cuisineOptions.map((cuisine) => (
                                        <button
                                            key={cuisine}
                                            type="button"
                                            onClick={() => {
                                                const current = formData.cuisineTypes;
                                                const updated = current.includes(cuisine)
                                                    ? current.filter(c => c !== cuisine)
                                                    : [...current, cuisine];
                                                setFormData({ ...formData, cuisineTypes: updated });
                                            }}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${formData.cuisineTypes.includes(cuisine) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            {cuisine}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Documents */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FileUploadBox 
                                label="CNIC Front Side *" 
                                field="documents.cnicFront" 
                                value={formData.documents.cnicFront} 
                            />
                            <FileUploadBox 
                                label="CNIC Back Side *" 
                                field="documents.cnicBack" 
                                value={formData.documents.cnicBack} 
                            />
                            {formData.businessType === 'restaurant' && (
                                <FileUploadBox 
                                    label="Trade License / Registration *" 
                                    field="documents.license" 
                                    value={formData.documents.license} 
                                />
                            )}
                            <FileUploadBox 
                                label="Menu Card (Optional)" 
                                field="documents.menu" 
                                value={formData.documents.menu} 
                            />
                        </div>
                    </div>
                )}

                {/* Step 4: Photos */}
                {step === 4 && (
                    <div className="space-y-6">
                        <FileUploadBox 
                            label={formData.businessType === 'restaurant' ? "Restaurant Storefront Photo *" : "Kitchen Area Photo *"}
                            field="storefrontPhoto" 
                            value={formData.storefrontPhoto} 
                        />
                        <FileUploadBox 
                            label="More Kitchen Photos (At least 1) *" 
                            field="kitchenPhotos" 
                            value={formData.kitchenPhotos} 
                            isArray 
                        />
                        <FileUploadBox 
                            label="Sample Dish Photos (Optional)" 
                            field="sampleDishPhotos" 
                            value={formData.sampleDishPhotos} 
                            isArray 
                        />
                    </div>
                )}

                {/* Step 5: Bank Details */}
                {step === 5 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">Account Holder Name *</label>
                                <input
                                    type="text"
                                    value={formData.bankDetails.accountHolderName}
                                    onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountHolderName: e.target.value } })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-medium bg-gray-50/50"
                                    placeholder="Full name as per bank"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">Bank Name *</label>
                                <input
                                    type="text"
                                    value={formData.bankDetails.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-medium bg-gray-50/50"
                                    placeholder="e.g. HBL, Alfalah"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-800 mb-1">Account Number / IBAN *</label>
                                <input
                                    type="text"
                                    value={formData.bankDetails.accountNumber}
                                    onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-medium bg-gray-50/50"
                                    placeholder="Enter complete bank account number"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-12 pt-8 border-t border-gray-100">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-8 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition"
                        >
                            Previous
                        </button>
                    ) : <div />}

                    {step < 5 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={!canGoNext()}
                            className={`px-10 py-3 rounded-xl font-bold transition ${canGoNext() ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!canGoNext() || loading}
                            className={`px-10 py-3 rounded-xl font-bold transition ${canGoNext() && !loading ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            {loading ? 'Submitting...' : 'Submit Registration'}
                        </button>
                    )}
                </div>

                {uploadingField && (
                    <div className="mt-4 text-center text-orange-600 font-medium animate-pulse">
                        Uploading {uploadingField}... Please wait.
                    </div>
                )}
            </div>
        </div>
    );
}

