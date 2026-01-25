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
    variant?: {
        name: string;
        price: number;
    };
    drinks?: Array<{
        name: string;
        price: number;
    }>;
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
        if (typeof window === 'undefined') return;
        
        const savedCart = localStorage.getItem('foodswipe_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error('Error parsing cart from localStorage:', e);
            }
        }

        const handleCartCleared = () => {
            setCart([]);
            setAppliedVoucher(null);
        };
        window.addEventListener('cartCleared', handleCartCleared);
        return () => window.removeEventListener('cartCleared', handleCartCleared);
    }, []);

    // Save cart to local storage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('foodswipe_cart', JSON.stringify(cart));
        }
    }, [cart]);

    const addToCart = (item: CartItem) => {
        setCart((prevCart) => {
            // Check if adding from a different restaurant
            if (prevCart.length > 0 && prevCart[0].restaurantId !== item.restaurantId) {
                // For webapp, we'll just clear and add new for now
                return [{ ...item, quantity: item.quantity || 1 }];
            }

            // Find if item with same ID, variant, and drinks already exists
            const existingItemIndex = prevCart.findIndex((i) => 
                i._id === item._id && 
                JSON.stringify(i.variant) === JSON.stringify(item.variant) &&
                JSON.stringify(i.drinks) === JSON.stringify(item.drinks)
            );

            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex] = { 
                    ...newCart[existingItemIndex], 
                    quantity: newCart[existingItemIndex].quantity + (item.quantity || 1) 
                };
                return newCart;
            }
            return [...prevCart, { ...item, quantity: item.quantity || 1 }];
        });
    };

    const removeFromCart = (id: string) => {
        setCart((prevCart) => prevCart.filter((item) => item._id !== id));
    };

    const clearCart = () => {
        console.log('🛒 CartContext: clearCart called');
        setCart([]);
        setAppliedVoucher(null);
        localStorage.removeItem('foodswipe_cart');
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
