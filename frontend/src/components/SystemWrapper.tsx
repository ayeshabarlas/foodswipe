'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTools, FaCloudDownloadAlt, FaExclamationTriangle, FaSync } from 'react-icons/fa';

interface SystemWrapperProps {
    children: React.ReactNode;
}

export default function SystemWrapper({ children }: SystemWrapperProps) {
    const { settings, loading } = useSettings();
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    
    // Check for app version
    useEffect(() => {
        if (settings?.appVersion) {
            const currentAppVersion = '1.0.0'; // Manually set to match settings default for now
            const minVersion = settings.appVersion.minVersion;
            
            if (isVersionLower(currentAppVersion, minVersion)) {
                setShowUpdatePrompt(true);
            }
        }
    }, [settings]);

    function isVersionLower(current: string, min: string) {
        const cParts = current.split('.').map(Number);
        const mParts = min.split('.').map(Number);
        
        for (let i = 0; i < Math.max(cParts.length, mParts.length); i++) {
            const c = cParts[i] || 0;
            const m = mParts[i] || 0;
            if (c < m) return true;
            if (c > m) return false;
        }
        return false;
    }

    if (loading) return <>{children}</>;

    // 1. Maintenance Mode
    if (settings?.isMaintenanceMode) {
        return (
            <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center p-6 text-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md"
                >
                    <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaTools className="text-orange-600 text-4xl animate-pulse" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Under Maintenance</h1>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        {settings.announcement || "We're currently performing some scheduled maintenance to improve your experience. We'll be back shortly!"}
                    </p>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-sm text-gray-500">
                            Estimated time: 30-60 minutes
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // 2. Force Update
    if (showUpdatePrompt && settings?.appVersion?.forceUpdate) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 text-center">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-8 max-w-sm shadow-2xl"
                >
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaCloudDownloadAlt className="text-blue-600 text-3xl" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Update Required</h2>
                    <p className="text-gray-600 mb-8">
                        A new version of Foodswipe is available. Please update to continue using the app.
                    </p>
                    <a 
                        href={settings.appVersion.updateUrl || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors mb-4"
                    >
                        Update Now
                    </a>
                    <p className="text-xs text-gray-400">
                        Current Version: {process.env.NEXT_PUBLIC_APP_VERSION || '0.1.4'}
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <>
            {children}
            
            {/* 3. Non-Force Update Toast (Optional) */}
            <AnimatePresence>
                {showUpdatePrompt && !settings?.appVersion?.forceUpdate && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl z-[50] flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <FaSync className="text-orange-400 animate-spin-slow" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">New version available!</p>
                                <p className="text-xs text-gray-400">Update for the best experience</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowUpdatePrompt(false)}
                                className="px-3 py-1.5 text-xs font-medium hover:bg-white/10 rounded-lg transition-colors"
                            >
                                Later
                            </button>
                            <a 
                                href={settings?.appVersion?.updateUrl || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-orange-500 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors"
                            >
                                Update
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
