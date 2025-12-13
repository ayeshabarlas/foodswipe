import { useState, useEffect } from 'react';

interface BreakpointState {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    width: number;
}

export const useResponsive = (): BreakpointState => {
    const [state, setState] = useState<BreakpointState>({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    });

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setState({
                isMobile: width < 768,
                isTablet: width >= 768 && width < 1024,
                isDesktop: width >= 1024,
                width,
            });
        };

        // Set initial state
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return state;
};
