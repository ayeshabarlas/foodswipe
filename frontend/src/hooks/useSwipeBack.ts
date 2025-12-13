import { useEffect, useRef } from 'react';

interface UseSwipeBackOptions {
    onSwipeBack: () => void;
    threshold?: number;
    sensitivity?: number;
}

export const useSwipeBack = ({ onSwipeBack, threshold = 100, sensitivity = 0.5 }: UseSwipeBackOptions) => {
    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const touchEndY = useRef<number>(0);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            touchEndX.current = e.touches[0].clientX;
            touchEndY.current = e.touches[0].clientY;
        };

        const handleTouchEnd = () => {
            const deltaX = touchEndX.current - touchStartX.current;
            const deltaY = Math.abs(touchEndY.current - touchStartY.current);

            // Swipe right detected (from left edge)
            if (
                touchStartX.current < 50 && // Started near left edge
                deltaX > threshold && // Swiped right enough
                deltaY < threshold * sensitivity // Mostly horizontal swipe
            ) {
                onSwipeBack();
            }
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onSwipeBack, threshold, sensitivity]);
};
