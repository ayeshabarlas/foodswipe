'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import RiderRegistration from './RiderRegistration';
import RiderDocumentUpload from './RiderDocumentUpload';
import RiderDashboard from './RiderDashboard';

export default function RiderPortal() {
    const [riderId, setRiderId] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'new' | 'pending' | 'approved' | 'rejected'>('new');
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'registration' | 'documents' | 'dashboard'>('registration');

    useEffect(() => {
        // Check if rider profile already exists
        const checkRiderProfile = async () => {
            try {
                const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;
                const res = await axios.get(`${API_BASE_URL}/api/riders/my-profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data) {
                    setRiderId(res.data._id);
                    setVerificationStatus(res.data.verificationStatus);

                    // Logic based on verification status
                    if (res.data.verificationStatus === 'approved') {
                        setStep('dashboard');
                    } else if (res.data.verificationStatus === 'new') {
                        setStep('documents');
                    } else if (res.data.verificationStatus === 'pending') {
                        setStep('documents');
                    } else if (res.data.verificationStatus === 'rejected') {
                        // For now just show document upload to fix issues
                        setStep('documents');
                    } else {
                        setStep('registration');
                    }
                } else {
                    setStep('registration');
                }
            } catch (error: any) {
                if (error.response?.status === 404) {
                    // No rider profile exists, start registration
                    setStep('registration');
                }
            } finally {
                setLoading(false);
            }
        };

        checkRiderProfile();
    }, []);

    const handleRegistrationComplete = (newRiderId: string) => {
        setRiderId(newRiderId);
        setStep('documents');
    };

    const handleVerified = () => {
        setVerificationStatus('approved');
        setStep('dashboard');
    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (step === 'registration') {
        return <RiderRegistration onComplete={handleRegistrationComplete} />;
    }

    if (step === 'documents' && riderId) {
        return <RiderDocumentUpload riderId={riderId} onVerified={handleVerified} />;
    }

    if (step === 'dashboard' && riderId) {
        return <RiderDashboard riderId={riderId} />;
    }

    return (
        <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Rider Portal</h1>
                <p className="text-gray-600">Loading...</p>
            </div>
        </div>
    );
}
