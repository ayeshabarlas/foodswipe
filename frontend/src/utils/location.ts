// Utility function to calculate distance between two coordinates using Haversine formula
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

// Hook to get user's current location
export function useUserLocation() {
    const [userLocation, setUserLocation] = React.useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [locationError, setLocationError] = React.useState<string>('');

    React.useEffect(() => {
        let watchId: number | null = null;

        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    // Save to localStorage for persistence
                    localStorage.setItem(
                        'userLocation',
                        JSON.stringify({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        })
                    );
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setLocationError('Unable to get your location');
                    // Try to get from localStorage if available
                    const saved = localStorage.getItem('userLocation');
                    if (saved) {
                        setUserLocation(JSON.parse(saved));
                    }
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        } else {
            setLocationError('Geolocation is not supported by your browser');
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    return { userLocation, locationError };
}

import React from 'react';
