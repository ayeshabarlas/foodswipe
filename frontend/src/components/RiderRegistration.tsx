'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
import { FaBicycle, FaArrowLeft, FaIdCard, FaCamera, FaCarSide, FaCheckCircle, FaTimes, FaUser, FaCalendarAlt, FaArrowRight } from 'react-icons/fa';

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

    // Fetch existing data if any
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
                if (!userInfo.token) return;

                const res = await axios.get(`${getApiUrl()}/api/riders/my-profile`, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });

                if (res.data) {
                    setRiderId(res.data._id);
                    setFormData({
                        fullName: res.data.fullName || '',
                        cnicNumber: res.data.cnicNumber || '',
                        dateOfBirth: res.data.dateOfBirth ? new Date(res.data.dateOfBirth).toISOString().split('T')[0] : '',
                        vehicleType: res.data.vehicleType || 'Bike',
                    });
                    if (res.data.documents) {
                        setDocuments(res.data.documents);
                    }
                }
            } catch (err) {
                console.log("No existing profile found");
            }
        };
        fetchData();
    }, []);

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
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        try {
            const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
            const res = await axios.post(`${getApiUrl()}/api/upload`, uploadFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`
                }
            });

            const filePath = res.data.fileUrl || res.data.path || res.data.imageUrl;
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
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-sm my-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <FaBicycle className="text-orange-500 text-2xl" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-1">Rider Portal</h1>
                    <p className="text-white/80 font-light text-sm">Join our delivery team</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl">
                    {step === 1 ? (
                        <>
                            <div className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Your Details</h2>
                                <p className="text-sm text-gray-400 font-light">Complete your profile to continue</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[13px] font-medium text-gray-700 mb-2 ml-1">Full Name</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                                            <FaUser size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-[15px] font-light text-gray-900 placeholder:text-gray-300"
                                            placeholder="Muhammad Ali"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[13px] font-medium text-gray-700 mb-2 ml-1">CNIC Number</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                                            <FaIdCard size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={formData.cnicNumber}
                                            onChange={handleCNICChange}
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-[15px] font-light text-gray-900 placeholder:text-gray-300"
                                            placeholder="12345-1234567-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[13px] font-medium text-gray-700 mb-2 ml-1">Date of Birth</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                                            <FaCalendarAlt size={16} />
                                        </div>
                                        <input
                                            type="date"
                                            required
                                            value={formData.dateOfBirth}
                                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-[15px] font-light text-gray-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[13px] font-medium text-gray-700 mb-4 ml-1">Vehicle Type</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vehicleType: 'Bike' })}
                                            className={`py-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${formData.vehicleType === 'Bike'
                                                ? 'border-orange-500 bg-orange-50/50 shadow-sm shadow-orange-500/10'
                                                : 'border-gray-100 bg-gray-50/30 hover:bg-gray-50 hover:border-gray-200'
                                                }`}
                                        >
                                            <FaBicycle className={`text-2xl ${formData.vehicleType === 'Bike' ? 'text-orange-500' : 'text-gray-300'}`} />
                                            <span className={`text-[13px] font-medium ${formData.vehicleType === 'Bike' ? 'text-orange-600' : 'text-gray-400'}`}>Bike</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vehicleType: 'Car' })}
                                            className={`py-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${formData.vehicleType === 'Car'
                                                ? 'border-orange-500 bg-orange-50/50 shadow-sm shadow-orange-500/10'
                                                : 'border-gray-100 bg-gray-50/30 hover:bg-gray-50 hover:border-gray-200'
                                                }`}
                                        >
                                            <FaCarSide className={`text-2xl ${formData.vehicleType === 'Car' ? 'text-orange-500' : 'text-gray-300'}`} />
                                            <span className={`text-[13px] font-medium ${formData.vehicleType === 'Car' ? 'text-orange-600' : 'text-gray-400'}`}>Car</span>
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-[12px] font-medium border border-red-100">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-8 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Processing...' : (
                                        <>
                                            Save & Continue <FaArrowRight size={14} />
                                        </>
                                    )}
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

