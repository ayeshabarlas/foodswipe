'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
    type?: 'video' | 'card' | 'text' | 'circle';
    count?: number;
}

export default function LoadingSkeleton({ type = 'card', count = 1 }: LoadingSkeletonProps) {
    const shimmer = {
        animate: {
            backgroundPosition: ['200% 0', '-200% 0'],
        },
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
        },
    } as const;

    const VideoSkeleton = () => (
        <div className="aspect-[9/16] bg-gray-800 rounded-xl overflow-hidden">
            <motion.div
                {...shimmer}
                className="w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]"
            />
        </div>
    );

    const CardSkeleton = () => (
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <motion.div
                {...shimmer}
                className="h-40 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded-lg"
            />
            <motion.div
                {...shimmer}
                className="h-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded w-3/4"
            />
            <motion.div
                {...shimmer}
                className="h-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded w-1/2"
            />
        </div>
    );

    const TextSkeleton = () => (
        <motion.div
            {...shimmer}
            className="h-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded"
        />
    );

    const CircleSkeleton = () => (
        <motion.div
            {...shimmer}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]"
        />
    );

    const renderSkeleton = () => {
        switch (type) {
            case 'video':
                return <VideoSkeleton />;
            case 'card':
                return <CardSkeleton />;
            case 'text':
                return <TextSkeleton />;
            case 'circle':
                return <CircleSkeleton />;
            default:
                return <CardSkeleton />;
        }
    };

    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index}>{renderSkeleton()}</div>
            ))}
        </>
    );
}
