import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  totalAmount: number; // Added for compatibility
  cartCount: number;
  appliedVoucher: any | null;
  setAppliedVoucher: (voucher: any | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<any | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('foodswipe_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error('Error loading cart:', e);
    }
  };

  const saveCart = async (newCart: CartItem[]) => {
    try {
      await AsyncStorage.setItem('foodswipe_cart', JSON.stringify(newCart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  };

  const addToCart = (item: CartItem) => {
    setCart((prevCart) => {
      // Check if adding from a different restaurant
      if (prevCart.length > 0 && prevCart[0].restaurantId !== item.restaurantId) {
        // In a real app, you'd show an alert. Here we'll just clear the cart and add the new item
        // or we could throw an error that the UI handles.
        // For now, let's keep it simple: clear and add new.
        const newCart = [{ ...item, quantity: item.quantity || 1 }];
        saveCart(newCart);
        return newCart;
      }

      // Find if item with same ID, variant, and drinks already exists
      const existingItemIndex = prevCart.findIndex((i) => 
        i._id === item._id && 
        JSON.stringify(i.variant) === JSON.stringify(item.variant) &&
        JSON.stringify(i.drinks) === JSON.stringify(item.drinks)
      );

      let newCart;
      if (existingItemIndex > -1) {
        newCart = [...prevCart];
        newCart[existingItemIndex] = { 
          ...newCart[existingItemIndex], 
          quantity: newCart[existingItemIndex].quantity + (item.quantity || 1) 
        };
      } else {
        newCart = [...prevCart, { ...item, quantity: item.quantity || 1 }];
      }
      saveCart(newCart);
      return newCart;
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => item._id !== id);
      saveCart(newCart);
      return newCart;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prevCart) => {
      let newCart;
      if (quantity <= 0) {
        newCart = prevCart.filter((item) => item._id !== id);
      } else {
        newCart = prevCart.map((item) =>
          item._id === id ? { ...item, quantity } : item
        );
      }
      saveCart(newCart);
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    setAppliedVoucher(null);
    AsyncStorage.removeItem('foodswipe_cart');
  };

  const applyVoucher = (voucher: { code: string; discount: number; type?: 'percentage' | 'fixed'; minimumAmount?: number }) => {
    setAppliedVoucher(voucher);
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
  };

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalAmount = cartTotal; // Alias for compatibility
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Calculate discount (matches webapp logic)
  let discountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.minimumAmount && cartTotal < appliedVoucher.minimumAmount) {
      discountAmount = 0;
    } else {
      if (appliedVoucher.type === 'fixed') {
        discountAmount = appliedVoucher.discount;
      } else {
        // Default to percentage
        discountAmount = (cartTotal * (appliedVoucher.discount || 0)) / 100;
      }
    }
  }

  const finalTotal = Math.max(0, cartTotal - discountAmount);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      cartTotal, 
      totalAmount,
      cartCount,
      appliedVoucher,
      setAppliedVoucher,
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
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
