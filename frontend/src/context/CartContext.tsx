'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
    _id: string;
    name: string;
    price: number;
    quantity: number;
    restaurantId: string;
    restaurantName: string;
    imageUrl?: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    appliedVoucher: { code: string; discount: number; type?: 'percentage' | 'fixed'; minimumAmount?: number } | null;
    applyVoucher: (voucher: { code: string; discount: number; type?: 'percentage' | 'fixed'; minimumAmount?: number }) => void;
    removeVoucher: () => void;
    discountAmount: number;
    finalTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number; type?: 'percentage' | 'fixed'; minimumAmount?: number } | null>(null);

    // Load cart from local storage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('foodswipe_cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
    }, []);

    // Save cart to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('foodswipe_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (item: CartItem) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((i) => i._id === item._id);
            if (existingItem) {
                return prevCart.map((i) =>
                    i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (id: string) => {
        setCart((prevCart) => prevCart.filter((item) => item._id !== id));
    };

    const clearCart = () => {
        setCart([]);
        setAppliedVoucher(null);
    };

    const applyVoucher = (voucher: { code: string; discount: number; type?: 'percentage' | 'fixed'; minimumAmount?: number }) => {
        setAppliedVoucher(voucher);
    };

    const removeVoucher = () => {
        setAppliedVoucher(null);
    };

    const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

    // Calculate discount
    let discountAmount = 0;
    if (appliedVoucher) {
        if (appliedVoucher.minimumAmount && cartTotal < appliedVoucher.minimumAmount) {
            // Voucher requirements not met
            discountAmount = 0;
        } else {
            if (appliedVoucher.type === 'fixed') {
                discountAmount = appliedVoucher.discount;
            } else {
                // Default to percentage if not specified or 'percentage'
                discountAmount = (cartTotal * appliedVoucher.discount) / 100;
            }
        }
    }

    const finalTotal = Math.max(0, cartTotal - discountAmount);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            clearCart,
            cartTotal,
            cartCount,
            appliedVoucher,
            applyVoucher,
            removeVoucher,
            discountAmount,
            finalTotal
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
