import { useState, useEffect } from 'react';

interface Location {
    lat: number;
    lng: number;
}

interface GeolocationError {
    code: number;
    message: string;
}

export const useGeolocation = (shouldTrack: boolean = false) => {
    const [location, setLocation] = useState<Location | null>(null);
    const [error, setError] = useState<GeolocationError | null>(null);

    useEffect(() => {
        if (!shouldTrack || !navigator.geolocation) {
            if (!navigator.geolocation) {
                setError({ code: 0, message: 'Geolocation not supported' });
            }
            return;
        }

        const handleSuccess = (pos: GeolocationPosition) => {
            setLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            });
        };

        const handleError = (err: GeolocationPositionError) => {
            setError({ code: err.code, message: err.message });
        };

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        const watchId = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            options
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [shouldTrack]);

    return { location, error };
};
