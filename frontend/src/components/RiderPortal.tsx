'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
import dynamic from 'next/dynamic';

const RiderRegistration = dynamic(() => import('./RiderRegistration'), { ssr: false });
const RiderDocumentUpload = dynamic(() => import('./RiderDocumentUpload'), { ssr: false });
const RiderDashboard = dynamic(() => import('./RiderDashboard'), { ssr: false });

export default function RiderPortal() {
    const [riderId, setRiderId] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'new' | 'pending' | 'approved' | 'rejected'>('new');
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'registration' | 'documents' | 'dashboard'>('registration');
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('userInfo');
            if (saved) setUserInfo(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        if (userInfo) {
            checkRiderProfile();
        }
    }, [userInfo]);

    // Check if rider profile already exists
    const checkRiderProfile = async () => {
        if (!userInfo?.token) {
            setLoading(false);
            // If no token, they need to login again
            localStorage.removeItem('userInfo');
            localStorage.removeItem('token');
            window.location.reload();
            return;
        }

        try {
            const res = await axios.get(`${getApiUrl()}/api/riders/my-profile`, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
                timeout: 20000
            });

            if (res.data) {
                setRiderId(res.data._id);
                setVerificationStatus(res.data.verificationStatus);
                
                // Logic updated: If cnicNumber is missing, go to registration (Details step)
                if (!res.data.cnicNumber) {
                    setStep('registration');
                } else if (!res.data.documents?.cnicFront) {
                    // If details exist but documents are missing, go to documents step
                    setStep('documents');
                } else {
                    setStep('dashboard');
                }
            } else {
                // No profile found, go to registration
                setStep('registration');
            }
        } catch (error: any) {
            console.log("Rider profile not found or error, showing registration");
            setStep('registration');
        } finally {
            setLoading(false);
        }
    };

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
            <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center overflow-y-auto">
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
        return <RiderDashboard riderId={riderId} onCompleteProfile={() => setStep('documents')} />;
    }

    return (
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6 overflow-y-auto">
            <div className="text-center max-w-sm w-full">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Rider Portal</h1>
                <p className="text-gray-600 mb-6">Setting up your dashboard...</p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-orange-500 text-white py-3 rounded-xl font-bold active:scale-95 transition-transform"
                    >
                        Retry
                    </button>
                    <button 
                        onClick={() => {
                            localStorage.removeItem('userInfo');
                            localStorage.removeItem('token');
                            window.location.href = '/login';
                        }}
                        className="bg-gray-200 text-gray-700 py-3 rounded-xl font-medium active:scale-95 transition-transform"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}

