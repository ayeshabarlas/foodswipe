'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { FaCheckCircle, FaCloudUploadAlt, FaFileAlt, FaImage } from 'react-icons/fa';

interface RiderDocumentUploadProps {
    riderId: string;
    onVerified: () => void;
}

export default function RiderDocumentUpload({ riderId, onVerified }: RiderDocumentUploadProps) {
    const [documents, setDocuments] = useState({
        cnicFront: '',
        cnicBack: '',
        drivingLicense: '',
        vehicleRegistration: '',
        profileSelfie: '',
    });
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
    const [uploadedCount, setUploadedCount] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [verified, setVerified] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState('new');

    useEffect(() => {
        // Fetch existing documents
        const fetchDocuments = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/${riderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.documents) {
                    setDocuments(res.data.documents);
                    const count = Object.values(res.data.documents).filter(doc => doc).length;
                    setUploadedCount(count);
                }

                if (res.data.verificationStatus) {
                    setVerificationStatus(res.data.verificationStatus);
                }

                // Check if already verified
                if (res.data.verificationStatus === 'approved') {
                    setVerified(true);
                }
            } catch (error) {
                console.error('Error fetching documents:', error);
            }
        };

        fetchDocuments();

        // Poll for verification status
        const interval = setInterval(fetchDocuments, 5000);
        return () => clearInterval(interval);
    }, [riderId]);

    const handleFileUpload = async (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [field]: true }));

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const imageUrl = uploadRes.data.imageUrl;

            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(`${API_BASE_URL}/api/riders/${riderId}/documents`, {
                [field]: imageUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setDocuments(prev => ({ ...prev, [field]: imageUrl }));
            setUploadedCount(prev => prev + 1);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload document');
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleSubmit = async () => {
        const requiredDocs = ['cnicFront', 'cnicBack', 'drivingLicense', 'profileSelfie'];
        const allUploaded = requiredDocs.every(doc => documents[doc as keyof typeof documents]);

        if (!allUploaded) {
            alert('Please upload all required documents');
            return;
        }

        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
            await axios.put(`${API_BASE_URL}/api/riders/${riderId}/submit-verification`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setVerificationStatus('pending');
            alert('Documents submitted successfully!');
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit for review');
        } finally {
            setSubmitting(false);
        }
    };

    if (verified) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-sm w-full">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaCheckCircle className="text-green-500 text-4xl" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Verified!</h2>
                    <p className="text-gray-600 font-light mb-8">
                        Congratulations! Your account has been approved. You can now start accepting orders.
                    </p>
                    <button
                        onClick={onVerified}
                        className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-semibold py-3.5 rounded-xl transition shadow-md"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        );
    }

    if (verificationStatus === 'pending') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-sm w-full">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Under Review</h2>
                    <p className="text-gray-600 font-light mb-8">
                        Your documents have been submitted and are under review. We will notify you once your account is approved.
                    </p>
                    <button
                        disabled
                        className="w-full bg-gray-100 text-gray-400 font-semibold py-3.5 rounded-xl cursor-not-allowed"
                    >
                        Check Status Again Later
                    </button>
                </div>
            </div>
        );
    }

    const totalRequired = 5;

    return (
        <div className="min-h-screen bg-gray-50 p-4 overflow-y-auto">
            <div className="max-w-2xl mx-auto pt-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Documents</h1>
                    <p className="text-gray-600 font-light text-sm">Upload the required documents to verify your account</p>

                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm font-semibold text-pink-600">{uploadedCount} / {totalRequired} uploaded</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-pink-600 transition-all duration-500"
                                style={{ width: `${(uploadedCount / totalRequired) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <DocumentItem
                        title="CNIC Front"
                        subtitle="Clear photo of front side"
                        required
                        uploaded={!!documents.cnicFront}
                        uploading={uploading['cnicFront']}
                        onUpload={(e) => handleFileUpload('cnicFront', e)}
                    />

                    <DocumentItem
                        title="CNIC Back"
                        subtitle="Clear photo of back side"
                        required
                        uploaded={!!documents.cnicBack}
                        uploading={uploading['cnicBack']}
                        onUpload={(e) => handleFileUpload('cnicBack', e)}
                    />

                    <DocumentItem
                        title="Driving License"
                        subtitle="Valid driving license"
                        required
                        uploaded={!!documents.drivingLicense}
                        uploading={uploading['drivingLicense']}
                        onUpload={(e) => handleFileUpload('drivingLicense', e)}
                    />

                    <DocumentItem
                        title="Vehicle Registration"
                        subtitle="Registration document (optional)"
                        required={false}
                        uploaded={!!documents.vehicleRegistration}
                        uploading={uploading['vehicleRegistration']}
                        onUpload={(e) => handleFileUpload('vehicleRegistration', e)}
                    />

                    <DocumentItem
                        title="Profile Selfie"
                        subtitle="Clear photo of your face"
                        required
                        uploaded={!!documents.profileSelfie}
                        uploading={uploading['profileSelfie']}
                        onUpload={(e) => handleFileUpload('profileSelfie', e)}
                        isImage
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={submitting || uploadedCount < 4}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-semibold py-3.5 rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
            </div>
        </div>
    );
}

function DocumentItem({
    title,
    subtitle,
    required,
    uploaded,
    uploading,
    onUpload,
    isImage = false
}: {
    title: string;
    subtitle: string;
    required: boolean;
    uploaded: boolean;
    uploading: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isImage?: boolean;
}) {
    return (
        <div className={`bg-white rounded-2xl p-4 border-2 transition ${uploaded ? 'border-green-200' : 'border-gray-100'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${uploaded ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {uploaded ? (
                        <FaCheckCircle className="text-green-500 text-xl" />
                    ) : isImage ? (
                        <FaImage className="text-gray-400 text-xl" />
                    ) : (
                        <FaFileAlt className="text-gray-400 text-xl" />
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{title}</h3>
                        {required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Required</span>}
                    </div>
                    <p className="text-sm text-gray-500 font-light">{subtitle}</p>
                    {uploaded && (
                        <div className="flex items-center gap-1 mt-2">
                            <FaCheckCircle className="text-teal-500 text-xs" />
                            <span className="text-xs text-teal-600 font-medium">Uploaded</span>
                        </div>
                    )}
                </div>

                {!uploaded && (
                    <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition font-medium text-sm">
                            {uploading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                            ) : (
                                <>
                                    <FaCloudUploadAlt />
                                    <span>Upload</span>
                                </>
                            )}
                        </div>
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={onUpload} />
                    </label>
                )}
            </div>
        </div>
    );
}
