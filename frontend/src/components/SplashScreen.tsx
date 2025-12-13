'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUtensils } from 'react-icons/fa';

interface SplashScreenProps {
    onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500); // Wait for exit animation
        }, 2500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
                >
                    {/* Blurred Food Background */}
                    <div className="absolute inset-0">
                        {/* Food background image */}
                        <img
                            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80"
                            alt="Food background"
                            className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/90 via-red-500/90 to-pink-500/90" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center gap-8">
                        {/* Animated Logo */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 260,
                                damping: 20,
                                delay: 0.2
                            }}
                            className="relative"
                        >
                            {/* White circle background */}
                            <div className="w-36 h-36 bg-white rounded-full shadow-2xl flex items-center justify-center">
                                {/* Fork and Spoon Icon - Custom SVG style */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-orange-500 flex items-center justify-center gap-1"
                                >
                                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                                        {/* Fork */}
                                        <path d="M8.1 4v9.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V4c0-.3.2-.5.5-.5s.5.2.5.5zm-2 0v9.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V4c0-.3.2-.5.5-.5s.5.2.5.5zm4 0v9.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V4c0-.3.2-.5.5-.5s.5.2.5.5zM7 14v6c0 .3.2.5.5.5s.5-.2.5-.5v-6h-1z" />
                                    </svg>
                                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                                        {/* Spoon */}
                                        <path d="M16.5 4c-1.4 0-2.5 1.1-2.5 2.5V8c0 1.4 1.1 2.5 2.5 2.5V20c0 .3.2.5.5.5s.5-.2.5-.5V10.5c1.4 0 2.5-1.1 2.5-2.5V6.5C20 5.1 18.9 4 17.5 4h-1z" />
                                    </svg>
                                </motion.div>
                            </div>

                            {/* Pulse effect */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 0, 0.5]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut'
                                }}
                                className="absolute inset-0 bg-white rounded-full"
                            />
                        </motion.div>

                        {/* App Name */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="text-center"
                        >
                            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
                                FoodSwipe
                            </h1>
                            <p className="text-white/90 text-lg font-medium tracking-wide">
                                Discover. Swipe. Order.
                            </p>
                        </motion.div>

                        {/* Loading Dots */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="flex gap-3"
                        >
                            {[0, 1, 2].map((index) => (
                                <motion.div
                                    key={index}
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        delay: index * 0.2,
                                        ease: 'easeInOut'
                                    }}
                                    className="w-3 h-3 bg-white rounded-full"
                                />
                            ))}
                        </motion.div>
                    </div>

                    {/* Decorative elements */}
                    <motion.div
                        animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                            scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                        }}
                        className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"
                    />
                    <motion.div
                        animate={{
                            rotate: -360,
                            scale: [1, 1.2, 1]
                        }}
                        transition={{
                            rotate: { duration: 15, repeat: Infinity, ease: 'linear' },
                            scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                        }}
                        className="absolute bottom-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-xl"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
