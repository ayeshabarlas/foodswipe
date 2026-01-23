'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ModernLoaderProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    text?: string;
    fullScreen?: boolean;
}

const ModernLoader: React.FC<ModernLoaderProps> = ({
    size = 'md',
    color = '#FF4500', // Orange-red primary color
    text,
    fullScreen = false
}) => {
    const sizeMap = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-20 h-20'
    };

    const loaderContent = (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className={`relative ${sizeMap[size]}`}>
                {/* Outer ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-gray-100"
                    style={{ borderTopColor: color }}
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1,
                        ease: "linear",
                        repeat: Infinity
                    }}
                />

                {/* Inner pulsing circle */}
                <motion.div
                    className="absolute inset-2 rounded-full opacity-20"
                    style={{ backgroundColor: color }}
                    animate={{
                        scale: [0.8, 1.1, 0.8],
                        opacity: [0.2, 0.5, 0.2]
                    }}
                    transition={{
                        duration: 1.5,
                        ease: "easeInOut",
                        repeat: Infinity
                    }}
                />

                {/* Orbiting dot */}
                <motion.div
                    className="absolute -top-1 left-1/2 w-2 h-2 rounded-full"
                    style={{
                        backgroundColor: color,
                        marginLeft: '-4px',
                        transformOrigin: `center ${size === 'lg' ? '44px' : size === 'md' ? '28px' : '16px'}`
                    }}
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 2,
                        ease: "linear",
                        repeat: Infinity
                    }}
                />
            </div>

            {text && (
                <motion.p
                    className="text-sm font-medium text-gray-500 tracking-wide"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
                {loaderContent}
            </div>
        );
    }

    return loaderContent;
};

export default ModernLoader;
