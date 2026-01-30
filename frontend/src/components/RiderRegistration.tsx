'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
import { FaBicycle, FaArrowLeft, FaIdCard, FaCamera, FaCarSide, FaCheckCircle, FaTimes } from 'react-icons/fa';

interface RiderRegistrationProps {
    onComplete: (riderId: string) => void;
}

export default function RiderRegistration({ onComplete }: RiderRegistrationProps) {
    const [step, setStep] = useState(1); // 1: Details, 2: Documents
    const [riderId, setRiderId] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        cnicNumber: '',
        dateOfBirth: '',
        vehicleType: 'Bike' as 'Bike' | 'Car',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [uploading, setUploading] = useState<string | null>(null);
    const [documents, setDocuments] = useState({
        cnicFront: '',
        cnicBack: '',
        drivingLicense: '',
        vehicleRegistration: '',
        profileSelfie: '',
    });

    const formatCNIC = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const limitedDigits = digits.slice(0, 13);
        if (limitedDigits.length <= 5) return limitedDigits;
        if (limitedDigits.length <= 12) return `${limitedDigits.slice(0, 5)}-${limitedDigits.slice(5, 12)}`;
        return `${limitedDigits.slice(0, 5)}-${limitedDigits.slice(5, 12)}-${limitedDigits.slice(12)}`;
    };

    const handleCNICChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, cnicNumber: formatCNIC(e.target.value) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!formData.fullName || !formData.cnicNumber || !formData.dateOfBirth) {
                setError('Please fill all fields');
                setLoading(false);
                return;
            }
            const cnicDigits = formData.cnicNumber.replace(/\D/g, '');
            if (cnicDigits.length !== 13) {
                setError('Invalid CNIC number');
                setLoading(false);
                return;
            }
            const dob = new Date(formData.dateOfBirth);
            const now = new Date();
            if (isNaN(dob.getTime()) || dob > now) {
                setError('Invalid date of birth');
                setLoading(false);
                return;
            }
            const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
            const token = userInfo.token;

            if (!token) {
                throw new Error('Authentication required. Please create an account or login first.');
            }

            const res = await axios.post(`${getApiUrl()}/api/riders/register`, formData, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000
            });

            setRiderId(res.data._id);
            setStep(2); // Move to document upload step
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(type);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
            const res = await axios.post(`${getApiUrl()}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`
                }
            });

            const filePath = res.data.fileUrl || res.data.path;
            setDocuments(prev => ({ ...prev, [type]: filePath }));

            // Update rider profile with the new document
            await axios.put(`${getApiUrl()}/api/riders/${riderId}/documents`, 
                { [type]: filePath },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload document');
        } finally {
            setUploading(null);
        }
    };

    const handleFinalSubmit = async () => {
        if (!documents.cnicFront || !documents.cnicBack || !documents.drivingLicense || !documents.profileSelfie) {
            setError('Please upload all required documents');
            return;
        }

        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
            await axios.put(`${getApiUrl()}/api/riders/${riderId}/submit-verification`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            onComplete(riderId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit for verification');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-pink-600 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-sm my-8">
                {step === 1 && (
                    <button
                        onClick={handleBackToLogin}
                        className="flex items-center gap-2 text-white/90 hover:text-white mb-4 font-normal transition"
                    >
                        <FaArrowLeft size={14} /> Back to Login
                    </button>
                )}

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FaBicycle className="text-orange-500 text-2xl" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Rider Portal</h1>
                    <p className="text-white/90 font-light">Join our delivery team</p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-2xl">
                    {step === 1 ? (
                        <>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Details</h2>
                                <p className="text-sm text-gray-500 font-light">Complete your profile to continue</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Full Name</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-gray-50/50"
                                            placeholder="Muhammad Ali"
                                        />
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">CNIC Number</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={formData.cnicNumber}
                                            onChange={handleCNICChange}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-gray-50/50"
                                            placeholder="12345-1234567-1"
                                        />
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                        </svg>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Date of Birth</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            required
                                            value={formData.dateOfBirth}
                                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm font-medium text-gray-900 bg-gray-50/50"
                                        />
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vehicleType: 'Bike' })}
                                            className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${formData.vehicleType === 'Bike'
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <FaBicycle className={`text-2xl ${formData.vehicleType === 'Bike' ? 'text-orange-500' : 'text-gray-400'}`} />
                                            <span className={`text-sm font-medium ${formData.vehicleType === 'Bike' ? 'text-orange-600' : 'text-gray-600'}`}>Bike</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vehicleType: 'Car' })}
                                            className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${formData.vehicleType === 'Car'
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <FaCarSide className={`text-2xl ${formData.vehicleType === 'Car' ? 'text-orange-500' : 'text-gray-400'}`} />
                                            <span className={`text-sm font-medium ${formData.vehicleType === 'Car' ? 'text-orange-600' : 'text-gray-600'}`}>Car</span>
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm font-light">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-semibold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                >
                                    {loading ? 'Processing...' : 'Continue'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-1">Documents</h2>
                                <p className="text-sm text-gray-500 font-light">Upload required documents for verification</p>
                            </div>

                            <div className="space-y-4">
                                <DocumentUploadItem 
                                    label="CNIC Front" 
                                    icon={<FaIdCard />} 
                                    status={documents.cnicFront ? 'Uploaded' : (uploading === 'cnicFront' ? 'Uploading...' : 'Required')}
                                    isUploaded={!!documents.cnicFront}
                                    onUpload={(e) => handleFileUpload(e, 'cnicFront')}
                                />
                                <DocumentUploadItem 
                                    label="CNIC Back" 
                                    icon={<FaIdCard />} 
                                    status={documents.cnicBack ? 'Uploaded' : (uploading === 'cnicBack' ? 'Uploading...' : 'Required')}
                                    isUploaded={!!documents.cnicBack}
                                    onUpload={(e) => handleFileUpload(e, 'cnicBack')}
                                />
                                <DocumentUploadItem 
                                    label="Driving License" 
                                    icon={<FaCarSide />} 
                                    status={documents.drivingLicense ? 'Uploaded' : (uploading === 'drivingLicense' ? 'Uploading...' : 'Required')}
                                    isUploaded={!!documents.drivingLicense}
                                    onUpload={(e) => handleFileUpload(e, 'drivingLicense')}
                                />
                                <DocumentUploadItem 
                                    label="Profile Selfie" 
                                    icon={<FaCamera />} 
                                    status={documents.profileSelfie ? 'Uploaded' : (uploading === 'profileSelfie' ? 'Uploading...' : 'Required')}
                                    isUploaded={!!documents.profileSelfie}
                                    onUpload={(e) => handleFileUpload(e, 'profileSelfie')}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm font-light">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 mt-8">
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={loading || !documents.cnicFront || !documents.cnicBack || !documents.drivingLicense || !documents.profileSelfie}
                                    className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-semibold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Submitting...' : 'Submit for Verification'}
                                </button>
                                <button
                                    onClick={() => setStep(1)}
                                    className="w-full py-3.5 text-gray-500 font-medium text-sm hover:text-gray-700 transition"
                                >
                                    Back to Details
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DocumentUploadItem({ label, icon, status, isUploaded, onUpload }: { label: string; icon: React.ReactNode; status: string; isUploaded: boolean; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div className="relative group">
            <input 
                type="file" 
                accept="image/*" 
                onChange={onUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-between ${isUploaded ? 'border-green-500 bg-green-50' : 'border-gray-200 group-hover:border-orange-300 bg-gray-50/50'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUploaded ? 'bg-green-100 text-green-600' : 'bg-white text-gray-400 shadow-sm'}`}>
                        {icon}
                    </div>
                    <div>
                        <p className={`text-sm font-semibold ${isUploaded ? 'text-green-900' : 'text-gray-900'}`}>{label}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isUploaded ? 'text-green-600' : (status === 'Uploading...' ? 'text-orange-500 animate-pulse' : 'text-gray-400')}`}>
                            {status}
                        </p>
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isUploaded ? 'bg-green-100 text-green-600' : 'bg-white text-gray-300 shadow-sm'}`}>
                    {isUploaded ? <FaCheckCircle size={14} /> : <FaCamera size={14} />}
                </div>
            </div>
        </div>
    );
}

