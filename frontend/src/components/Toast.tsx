'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

interface ToastContextType {
    showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, message }]);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <FaCheckCircle className="text-green-500" size={20} />;
            case 'error':
                return <FaExclamationCircle className="text-red-500" size={20} />;
            case 'info':
                return <FaInfoCircle className="text-blue-500" size={20} />;
            default:
                return null;
        }
    };

    const getBackgroundColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-500/20 border-green-500/50';
            case 'error':
                return 'bg-red-500/20 border-red-500/50';
            case 'info':
                return 'bg-blue-500/20 border-blue-500/50';
            default:
                return 'bg-gray-500/20 border-gray-500/50';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full px-4">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.95 }}
                            className={`${getBackgroundColor(toast.type)} backdrop-blur-md border rounded-xl p-4 shadow-lg flex items-center gap-3`}
                        >
                            {getIcon(toast.type)}
                            <p className="flex-1 text-white text-sm font-medium">{toast.message}</p>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-gray-400 hover:text-white transition"
                            >
                                <FaTimes size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
