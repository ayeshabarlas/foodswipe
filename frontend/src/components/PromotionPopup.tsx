'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaTicketAlt, FaCopy, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface PromotionPopupProps {
    voucher: any;
    onClose: () => void;
}

export default function PromotionPopup({ voucher, onClose }: PromotionPopupProps) {
    if (!voucher) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(voucher.code);
        toast.success(`Code ${voucher.code} copied!`);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Background Pattern */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[#FF6A00] to-[#EE0979] opacity-10" />
                    
                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
                    >
                        <FaTimes size={20} />
                    </button>

                    <div className="p-8 pt-10 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6A00] to-[#EE0979] text-white mb-6 shadow-lg shadow-[#FF6A00]/20">
                            <FaTicketAlt size={36} />
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 mb-2">
                            {voucher.discountType === 'percentage' ? `${voucher.discount}% OFF` : `Rs.${voucher.discount} OFF`}
                        </h2>
                        <p className="text-gray-500 font-medium mb-8">
                            {voucher.description || 'Exclusive discount just for you!'}
                        </p>

                        <div className="relative group cursor-pointer mb-8" onClick={handleCopy}>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#FF6A00] to-[#EE0979] blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative flex items-center justify-between px-6 py-4 bg-gray-50 border-2 border-dashed border-[#FF6A00]/30 rounded-2xl group-hover:border-[#FF6A00]/50 transition-colors">
                                <div className="text-left">
                                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Voucher Code</p>
                                    <p className="text-xl font-black text-gray-900 tracking-wider">{voucher.code}</p>
                                </div>
                                <div className="flex items-center gap-2 text-[#FF6A00] font-bold text-sm">
                                    <span>Copy</span>
                                    <FaCopy size={14} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-2 text-gray-600 text-sm justify-center">
                                <FaCheckCircle className="text-green-500" />
                                <span>Minimum order: Rs. {voucher.minimumAmount}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 text-sm justify-center">
                                <FaCheckCircle className="text-green-500" />
                                <span>Valid until: {new Date(voucher.expiryDate).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gradient-to-r from-[#FF6A00] to-[#EE0979] text-white font-black rounded-2xl shadow-xl shadow-[#FF6A00]/30 hover:shadow-[#FF6A00]/40 active:scale-[0.98] transition-all"
                        >
                            CLAIM NOW
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
