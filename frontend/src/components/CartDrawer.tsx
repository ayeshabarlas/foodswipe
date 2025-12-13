'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMinus, FaPlus, FaTrash } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import CheckoutModal from './CheckoutModal';
import { useSwipeBack } from '../hooks/useSwipeBack';

import { getImageUrl } from '../utils/imageUtils';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onTrackOrder?: (orderId: string) => void;
}

export default function CartDrawer({ isOpen, onClose, onTrackOrder }: CartDrawerProps) {
    const { cart, addToCart, removeFromCart, cartTotal, clearCart } = useCart();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Enable swipe back gesture
    useSwipeBack({ onSwipeBack: onClose });

    const deliveryFee = 50;
    const taxRate = 0.08;
    const subtotal = cartTotal;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + deliveryFee + tax;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={onClose}
                        />

                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center p-5 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <p className="text-gray-900 text-lg font-medium mb-2">Your cart is empty</p>
                                        <p className="text-gray-500 text-sm">Add items from restaurant menus</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map((item) => (
                                            <div key={item._id} className="flex items-start gap-3 bg-white">
                                                <div className="w-20 h-20 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                                                    <img
                                                        src={getImageUrl(item.imageUrl) || `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop`}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 text-base">{item.name}</h3>
                                                    <p className="text-gray-500 text-sm">{item.restaurantName}</p>
                                                    <p className="text-orange-500 font-bold text-base mt-1">Rs. {item.price}</p>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => removeFromCart(item._id)}
                                                        className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                if (item.quantity > 1) {
                                                                    removeFromCart(item._id);
                                                                    if (item.quantity > 1) {
                                                                        addToCart({ ...item, quantity: item.quantity - 1 });
                                                                    }
                                                                }
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
                                                        >
                                                            <FaMinus size={10} />
                                                        </button>
                                                        <span className="font-medium text-gray-900 w-6 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => addToCart(item)}
                                                            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
                                                        >
                                                            <FaPlus size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {cart.length > 0 && (
                                <div className="p-5 border-t border-gray-200 bg-white">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-bold text-gray-900">Rs. {subtotal}</span>
                                    </div>
                                    <button
                                        onClick={() => setIsCheckoutOpen(true)}
                                        className="w-full py-4 bg-gradient-orange-red rounded-full text-white font-bold text-base shadow-lg hover:shadow-xl transition active:scale-95"
                                    >
                                        Proceed to Checkout
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cart={cart}
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                tax={tax}
                total={total}
                onSuccess={() => {
                    // Optional: Close cart drawer too if needed, or just let user close it
                    // onClose(); 
                }}
                onTrackOrder={onTrackOrder}
            />
        </>
    );
}
