'use client';

import React from 'react';
import SettingsTab from './SettingsTab';

interface DashboardSettingsProps {
    restaurant: any;
    onUpdate: () => void;
}

export default function DashboardSettings({ restaurant, onUpdate }: DashboardSettingsProps) {
    if (!restaurant) {
        return <div className="text-center text-gray-500 p-8">Loading settings...</div>;
    }

    return <SettingsTab restaurant={restaurant} onUpdate={onUpdate} />;
}
