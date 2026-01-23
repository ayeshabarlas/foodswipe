'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/config';
import { getSocket } from '../utils/socket';

export interface SystemSettings {
    commission: number;
    commissionRate: number;
    supportEmail: string;
    supportPhone: string;
    announcement: string;
    isMaintenanceMode: boolean;
    minimumOrderAmount: number;
    deliveryFee: number;
    deliveryFeeBase: number;
    deliveryFeePerKm: number;
    deliveryFeeMax: number;
    serviceFee: number;
    taxRate: number;
    isTaxEnabled: boolean;
    googleMapsApiKey: string;
    featureToggles: {
        enableWallet: boolean;
        enableReferrals: boolean;
        enableVouchers: boolean;
        enableReviews: boolean;
        enableLiveTracking: boolean;
        enableNotifications: boolean;
        enableSafepay: boolean;
        enableJazzCash: boolean;
        enableEasyPaisa: boolean;
        enableCOD: boolean;
        [key: string]: boolean;
    };
    appVersion: {
        currentVersion: string;
        minVersion: string;
        updateUrl: string;
        forceUpdate: boolean;
    };
    safepay: {
        environment: 'sandbox' | 'production';
        publicKey: string;
        v3Key: string;
    };
}

const DEFAULT_SETTINGS: SystemSettings = {
    commission: 15,
    commissionRate: 15,
    supportEmail: 'support@foodswipe.com',
    supportPhone: '',
    announcement: '',
    isMaintenanceMode: false,
    minimumOrderAmount: 0,
    deliveryFee: 40,
    deliveryFeeBase: 40,
    deliveryFeePerKm: 20,
    deliveryFeeMax: 100,
    serviceFee: 0,
    taxRate: 8,
    isTaxEnabled: true,
    googleMapsApiKey: 'AIzaSyBBwurPdZPLvTupX_YGiHYZRG3-ct3NWKU',
    featureToggles: {
        enableWallet: true,
        enableReferrals: true,
        enableVouchers: true,
        enableReviews: true,
        enableLiveTracking: true,
        enableNotifications: true,
        enableSafepay: true,
        enableJazzCash: true,
        enableEasyPaisa: true,
        enableCOD: true
    },
    appVersion: {
        currentVersion: '1.0.0',
        minVersion: '1.0.0',
        updateUrl: '',
        forceUpdate: false
    },
    safepay: {
        environment: 'sandbox',
        publicKey: '',
        v3Key: ''
    }
};

export function useSettings() {
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            // Add timestamp to bypass potential browser cache
            const { data } = await axios.get(`${getApiUrl()}/api/settings?t=${Date.now()}`);
            if (data) {
                setSettings(data);
            }
        } catch (err: any) {
            console.error('Error fetching system settings:', err);
            setError(err.message || 'Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();

        // Listen for settings updates via socket
        const socket = getSocket();
        if (socket) {
            socket.on('stats_updated', (data: any) => {
                if (data.type === 'settings_updated') {
                    console.log('🔄 Settings updated via socket, refetching...');
                    fetchSettings();
                }
            });
        }

        // Optional: Polling to keep settings synced (every 30 seconds)
        const interval = setInterval(fetchSettings, 30000);
        return () => {
            if (socket) socket.off('stats_updated');
            clearInterval(interval);
        };
    }, []);

    return { settings, loading, error, refetch: fetchSettings };
}

