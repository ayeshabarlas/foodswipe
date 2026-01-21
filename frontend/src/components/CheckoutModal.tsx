'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaClock, FaCreditCard, FaMoneyBillWave, FaWallet, FaCheckCircle, FaMapMarkerAlt, FaEdit, FaGift } from 'react-icons/fa';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import { useSwipeBack } from '../hooks/useSwipeBack';
import ModernLoader from './ModernLoader';
import PhoneAuthModal from './PhoneAuthModal';
import { API_BASE_URL } from '../utils/config';
import { calculateDistance } from '../utils/location';
import { useSettings } from '../hooks/useSettings';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: any[];
    total: number;
    subtotal: number;
    deliveryFee: number;
    tax: number;
    onSuccess: () => void;
    onTrackOrder?: (orderId: string) => void;
}

export default function CheckoutModal({ isOpen, onClose, cart, total, subtotal, deliveryFee, tax, onSuccess, onTrackOrder }: CheckoutModalProps) {
    const router = useRouter();
    const { settings } = useSettings();
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod' | 'jazzcash' | 'easypaisa'>('card');
    const [paymentStep, setPaymentStep] = useState<'selection' | 'details' | 'verifying'>('selection');
    const [walletNumber, setWalletNumber] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [houseNumber, setHouseNumber] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [placedOrder, setPlacedOrder] = useState<any>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const { clearCart, appliedVoucher, applyVoucher, removeVoucher } = useCart();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingAddress, setLoadingAddress] = useState(false);
    // const [appliedVoucher, setAppliedVoucher] = useState<any>(null); // Removed local state
    const [voucherError, setVoucherError] = useState('');
    const [applyingVoucher, setApplyingVoucher] = useState(false);
    const [showPhoneAuth, setShowPhoneAuth] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [calculatedFee, setCalculatedFee] = useState(deliveryFee);
    const [distance, setDistance] = useState<number | null>(null);

    // Fetch restaurant location and calculate fee
    useEffect(() => {
        const fetchRestaurantAndCalculateFee = async () => {
            if (!isOpen || !cart || cart.length === 0) return;

            const resId = cart[0].restaurantId || cart[0].restaurant?._id || cart[0].restaurant;
            if (!resId) return;

            try {
                const response = await axios.get(`${API_BASE_URL}/api/restaurants/${resId}`);
                const restaurant = response.data;
                
                if (restaurant?.location?.coordinates && deliveryLocation) {
                    const [restLng, restLat] = restaurant.location.coordinates;
                    const dist = calculateDistance(restLat, restLng, deliveryLocation.lat, deliveryLocation.lng);
                    setDistance(dist);
                    
                    // Dynamic Logic from Settings
                    const baseFee = settings?.deliveryFeeBase ?? 40;
                    const perKmFee = settings?.deliveryFeePerKm ?? 20;
                    const maxFee = settings?.deliveryFeeMax ?? 100;

                    const newFee = baseFee + (dist * perKmFee);
                    // Cap delivery fee based on settings
                    const finalFee = Math.min(maxFee, Math.round(newFee));
                    setCalculatedFee(finalFee);
                } else if (!deliveryLocation) {
                    // Fallback to base fee if no location selected yet
                    const baseFee = settings?.deliveryFeeBase ?? 40;
                    const maxFee = settings?.deliveryFeeMax ?? 100;
                    setCalculatedFee(Math.min(maxFee, baseFee));
                    setDistance(null);
                }
            } catch (err) {
                console.error('Error fetching restaurant for fee calculation:', err);
            }
        };

        fetchRestaurantAndCalculateFee();
    }, [isOpen, deliveryLocation, cart, deliveryFee]);

    // Enable swipe back gesture
    useSwipeBack({ onSwipeBack: onClose });

    // Check phone verification status when modal opens
    useEffect(() => {
        if (isOpen) {
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                try {
                    const userInfo = JSON.parse(userInfoStr);
                    setPhoneVerified(userInfo.phoneVerified || false);
                } catch (e) {
                    console.error('Error parsing userInfo for phone status:', e);
                }
            }
        }
    }, [isOpen]);

    // Use settings for payment toggles
    const availablePaymentMethods = [
        { id: 'card', label: 'Credit/Debit Card', sub: 'Secure via Safepay', icon: 'VISA', enabled: settings?.featureToggles?.enableSafepay !== false },
        { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when you receive', icon: <FaMoneyBillWave className="text-green-600" />, enabled: settings?.featureToggles?.enableCOD !== false },
        { id: 'jazzcash', label: 'JazzCash', sub: 'Secure via Safepay', icon: 'JC', enabled: settings?.featureToggles?.enableJazzCash !== false },
        { id: 'easypaisa', label: 'EasyPaisa', sub: 'Secure via Safepay', icon: 'EP', enabled: settings?.featureToggles?.enableEasyPaisa !== false },
    ].filter(m => m.enabled);

    // Update payment method if current one is disabled
    useEffect(() => {
        if (settings && !loading && availablePaymentMethods.length > 0) {
            const currentMethodEnabled = availablePaymentMethods.some(m => m.id === paymentMethod);
            if (!currentMethodEnabled) {
                setPaymentMethod(availablePaymentMethods[0].id as any);
            }
        }
    }, [settings, loading]);

    const handleTrackOrder = () => {
        if (placedOrder && onTrackOrder) {
            onTrackOrder(placedOrder.id);
        }
        onClose();
    };

    // Initialize address and reset success state from userInfo when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            // Reset success states for a fresh checkout experience
            setOrderSuccess(false);
            setPlacedOrder(null);
            
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                try {
                    const userInfo = JSON.parse(userInfoStr);
                    setDeliveryAddress(userInfo.address || '');
                    setHouseNumber(userInfo.houseNumber || '');
                } catch (e) {
                    console.error('Error parsing userInfo for address:', e);
                }
            }
        } else {
            // Also reset when closing to be absolutely sure
            setOrderSuccess(false);
            setPlacedOrder(null);
        }
    }, [isOpen]);

    // Stop confetti after 3 seconds
    useEffect(() => {
        if (showConfetti) {
            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showConfetti]);

    const handleApplyPromoCode = async () => {
        if (!promoCode.trim()) {
            setVoucherError('Please enter a promo code');
            return;
        }

        setApplyingVoucher(true);
        setVoucherError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setVoucherError('Please login to apply vouchers');
                setApplyingVoucher(false);
                return;
            }

            const response = await axios.post(
                `${API_BASE_URL}/api/vouchers/verify`,
                { code: promoCode.toUpperCase(), amount: subtotal },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.valid) {
                applyVoucher(response.data.voucher);
                setVoucherError('');
            }
        } catch (error: any) {
            setVoucherError(error.response?.data?.message || 'Invalid promo code');
            // setAppliedVoucher(null); // No need to set null, context handles it or we just don't apply
        } finally {
            setApplyingVoucher(false);
        }
    };

    const handleRemoveVoucher = () => {
        removeVoucher();
        setPromoCode('');
        setVoucherError('');
    };

    const handleAddressSearch = async (val: string) => {
        setDeliveryAddress(val);
        // Clear previous location when user starts typing a new address
        // This ensures the delivery fee recalculates for the new address
        if (deliveryLocation) {
            setDeliveryLocation(null);
            setDistance(null);
        }

        // Clear previous timeout
        if ((window as any).addressSearchTimeout) {
            clearTimeout((window as any).addressSearchTimeout);
        }

        if (val.length > 2) {
            setLoadingAddress(true);

            // Debounce search (300ms)
            (window as any).addressSearchTimeout = setTimeout(async () => {
                try {
                    // Use Photon with context for better results
                    const res = await axios.get(`https://photon.komoot.io/api/`, {
                        params: {
                            q: `${val}, Lahore, Pakistan`,
                            limit: 30,
                            lat: 31.5204,
                            lon: 74.3587,
                            location_bias_scale: 0.3,
                            lang: 'en'
                        }
                    });

                    // More permissive filtering
                    const lahoreResults = res.data.features.filter((feature: any) => {
                        const props = feature.properties;
                        const coords = feature.geometry.coordinates;

                        const isLahoreCity = props.city === 'Lahore' || props.county === 'Lahore';
                        const isPunjab = props.state === 'Punjab' || props.country === 'Pakistan';
                        const isNearLahore = coords[1] >= 31.3 && coords[1] <= 31.7 &&
                            coords[0] >= 74.1 && coords[0] <= 74.6;

                        return isLahoreCity || (isPunjab && isNearLahore);
                    });

                    setSuggestions(lahoreResults);
                    setShowSuggestions(true);

                    // If we have results, and deliveryLocation is null, pick the first one as a tentative location
                    if (lahoreResults.length > 0 && !deliveryLocation) {
                        const first = lahoreResults[0];
                        if (first.geometry && first.geometry.coordinates) {
                            setDeliveryLocation({
                                lat: first.geometry.coordinates[1],
                                lng: first.geometry.coordinates[0]
                            });
                        }
                    }
                } catch (err) {
                    console.error("Address fetch error", err);
                } finally {
                    setLoadingAddress(false);
                }
            }, 300);
        } else {
            setShowSuggestions(false);
            setLoadingAddress(false);
        }
    };

    // New: Attempt to geocode address on blur if location is still null
    const handleAddressBlur = async () => {
        setTimeout(async () => {
            setShowSuggestions(false);
            
            if (deliveryAddress.length > 5 && !deliveryLocation) {
                setLoadingAddress(true);
                try {
                    const res = await axios.get(`https://photon.komoot.io/api/`, {
                        params: {
                            q: `${deliveryAddress}, Lahore, Pakistan`,
                            limit: 1,
                            lat: 31.5204,
                            lon: 74.3587
                        }
                    });
                    
                    if (res.data.features && res.data.features.length > 0) {
                        const feature = res.data.features[0];
                        setDeliveryLocation({
                            lat: feature.geometry.coordinates[1],
                            lng: feature.geometry.coordinates[0]
                        });
                    }
                } catch (err) {
                    console.error("Manual geocode error", err);
                } finally {
                    setLoadingAddress(false);
                }
            }
        }, 200);
    };

    // Calculate discount and dynamic totals
    const discountAmount = appliedVoucher
        ? Math.round((subtotal * appliedVoucher.discount) / 100)
        : 0;
    
    // Service Fee from settings
    const serviceFee = settings?.serviceFee || 0;
    
    // Recalculate tax based on settings
    const isTaxEnabled = settings?.isTaxEnabled === true;
    const taxRate = isTaxEnabled ? (settings?.taxRate || 8) : 0;
    const calculatedTax = isTaxEnabled ? Math.round((subtotal * taxRate) / 100) : 0;
    
    // Recalculate total with dynamic delivery fee, service fee, and dynamic tax
    const currentTotal = subtotal + calculatedFee + calculatedTax + serviceFee - discountAmount;

    const handlePlaceOrder = async () => {
        console.log('handlePlaceOrder initiated');

        // Check phone verification directly from localStorage and state to avoid state sync issues
        const userInfoStr = localStorage.getItem('userInfo');
        let userInfo: any = {};
        try {
            userInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
        } catch (e) {
            console.error('Error parsing userInfo:', e);
        }

        // IMPORTANT: If phone is already verified in state or userInfo, skip phone auth
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        if (phoneVerified || userInfo.phoneVerified === true || userInfo.phoneVerified === 'true' || isLocalhost) {
            console.log(isLocalhost ? 'Localhost detected, bypassing phone verification' : 'Phone already verified, proceeding to place order');
        } else {
            console.log('Phone not verified, showing phone auth modal');
            setShowPhoneAuth(true);
            return;
        }

        try {
            setLoading(true);
            let token = localStorage.getItem('token');

            if (!token && userInfoStr) {
                try {
                    const parsedUser = JSON.parse(userInfoStr);
                    if (parsedUser.token) {
                        token = parsedUser.token;
                        localStorage.setItem('token', token || '');
                    }
                } catch (e) {
                    console.error('Error parsing userInfo:', e);
                }
            }

            if (!token) {
                alert('Please login to place an order');
                setLoading(false);
                return;
            }

            if (!deliveryAddress.trim()) {
                alert('Please enter a delivery address');
                setLoading(false);
                return;
            }

            if (!cart || cart.length === 0) {
                alert('Cart is empty');
                setLoading(false);
                return;
            }

            let restaurantId = cart[0].restaurantId || cart[0].restaurant?._id || cart[0].restaurant;
            if (!restaurantId) {
                const itemWithRestaurant = cart.find(item => item.restaurantId || item.restaurant?._id || item.restaurant);
                if (itemWithRestaurant) {
                    restaurantId = itemWithRestaurant.restaurantId || itemWithRestaurant.restaurant?._id || itemWithRestaurant.restaurant;
                }
            }

            // Fallback for some structures
            if (!restaurantId && cart[0].dish?.restaurant) {
                restaurantId = cart[0].dish.restaurant;
            }

            if (!restaurantId) {
                console.error('No restaurant ID found in cart items:', cart);
                alert('System Error: Could not identify the restaurant. Please try adding items to cart again.');
                setLoading(false);
                return;
            }

            const items = cart.map(item => ({
                dish: item._id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                image: item.imageUrl || 'https://placehold.co/600x400/orange/white?text=FoodSwipe',
            }));

            // Combine house number with address
            const fullAddress = houseNumber
                ? `${houseNumber}, ${deliveryAddress}`
                : deliveryAddress;

            const orderData = {
                restaurant: restaurantId,
                items: items,
                deliveryAddress: fullAddress,
                deliveryLocation: deliveryLocation,
                subtotal: subtotal,
                deliveryFee: calculatedFee,
                serviceFee: serviceFee,
                tax: calculatedTax,
                totalAmount: currentTotal,
                paymentMethod,
                transactionId: null,
                deliveryInstructions,
                promoCode: appliedVoucher ? appliedVoucher.code : ''
            };

            const response = await axios.post(
                `${API_BASE_URL}/api/orders`,
                orderData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const order = response.data;

            // Handle Safepay for online payments
            if (paymentMethod !== 'cod') {
                try {
                    const safepayRes = await axios.post(
                        `${API_BASE_URL}/api/payments/safepay/checkout`,
                        { orderId: order._id },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    
                    if (safepayRes.data.url) {
                        window.location.href = safepayRes.data.url;
                        return; // Stop execution as we are redirecting
                    }
                } catch (err) {
                    console.error('Safepay initiation failed:', err);
                    alert('Online payment failed to initialize. Please try COD or try again.');
                    setLoading(false);
                    return;
                }
            }

            setPlacedOrder({
                id: order._id || '#8703',
                estimatedTime: '25-35 min',
                deliveryAddress: fullAddress,
                total: currentTotal
            });

            // Sync address to user profile if changed
            try {
                const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
                if (currentUser && (currentUser.address !== deliveryAddress || currentUser.houseNumber !== houseNumber)) {
                    // Update local storage first for immediate feedback
                    const updatedUser = { 
                        ...currentUser, 
                        address: deliveryAddress,
                        houseNumber: houseNumber 
                    };
                    localStorage.setItem('userInfo', JSON.stringify(updatedUser));

                    // Update backend
                    await axios.put(
                        `${API_BASE_URL}/api/auth/profile`,
                        { 
                            address: deliveryAddress,
                            houseNumber: houseNumber 
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            } catch (err) {
                console.error('Failed to sync address to profile:', err);
                // Don't block order success for this
            }

            setOrderSuccess(true);
            setShowConfetti(true);
            clearCart();

        } catch (error: any) {
            console.error('Order placement failed:', error);
            if (error.response && error.response.status === 401) {
                alert('Session expired. Please login again.');
            } else {
                const errorMessage = error.response?.data?.message || error.message || 'Failed to place order';
                alert(`Order Failed: ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-x-0 bottom-0 h-[90vh] bg-gray-50 z-[70] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden md:max-w-md md:mx-auto md:inset-x-auto md:top-10 md:h-auto md:rounded-2xl"
                    >
                        {orderSuccess && placedOrder ? (
                            <div className="flex flex-col h-full bg-white relative overflow-hidden">
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10 overflow-y-auto no-scrollbar">
                                    {/* Simple Success Icon - Exact match to screenshot */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                        className="mb-6"
                                    >
                                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                            <FaCheckCircle className="text-3xl text-white" />
                                        </div>
                                    </motion.div>

                                    <motion.h2
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-xl font-semibold mb-1 text-gray-900"
                                    >
                                        Order Placed Successfully!
                                    </motion.h2>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-gray-700 font-medium mb-6 text-xs"
                                    >
                                        Your delicious food is being prepared
                                    </motion.p>

                                    {/* Clean Order Details Card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="w-full max-w-sm bg-orange-50 rounded-2xl p-4 mb-6 border border-orange-100"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                                                        <FaWallet className="text-orange-500 text-xs" />
                                                    </div>
                                                    <p className="text-xs text-gray-800 font-medium">Order Number</p>
                                                </div>
                                                <p className="font-semibold text-orange-500 text-sm">#{placedOrder.id.slice(-4).toUpperCase()}</p>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                                                        <FaClock className="text-orange-500 text-xs" />
                                                    </div>
                                                    <p className="text-xs text-gray-800 font-medium">Estimated Time</p>
                                                </div>
                                                <p className="font-semibold text-orange-500 text-sm">{placedOrder.estimatedTime}</p>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                                                        <FaMapMarkerAlt className="text-orange-500 text-xs" />
                                                    </div>
                                                    <p className="text-xs text-gray-800 font-medium">Delivery to</p>
                                                </div>
                                                <p className="font-semibold text-orange-500 text-sm">{placedOrder.deliveryAddress}</p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Simple Progress Steps */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="flex items-start justify-center mb-8"
                                    >
                                        <div className="flex items-center">
                                            {/* Confirmed - Active */}
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                                    <FaCheckCircle className="text-2xl text-white" />
                                                </div>
                                                <span className="text-xs font-semibold text-gray-900">Confirmed</span>
                                            </div>

                                            {/* Line */}
                                            <div className="w-20 h-0.5 bg-gray-300 mx-2 mb-6"></div>

                                            {/* Preparing - Inactive */}
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-14 h-14 bg-gray-300 rounded-full flex items-center justify-center">
                                                    <FaClock className="text-xl text-gray-500" />
                                                </div>
                                                <span className="text-xs font-normal text-gray-400">Preparing</span>
                                            </div>

                                            {/* Line */}
                                            <div className="w-20 h-0.5 bg-gray-300 mx-2 mb-6"></div>

                                            {/* Delivered - Inactive */}
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-14 h-14 bg-gray-300 rounded-full flex items-center justify-center">
                                                    <FaMapMarkerAlt className="text-xl text-gray-500" />
                                                </div>
                                                <span className="text-xs font-normal text-gray-400">Delivered</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Buttons */}
                                <div className="p-6 bg-white space-y-3">
                                    <button
                                        onClick={handleTrackOrder}
                                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white font-bold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
                                    >
                                        Track Your Order
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 text-gray-600 font-semibold hover:text-gray-900 transition flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        Back to Home
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Clean Header */}
                                <div className="bg-white p-5 border-b border-gray-100 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-bold text-gray-900">Checkout</h2>
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-gray-100 rounded-full transition"
                                        >
                                            <FaTimes size={20} className="text-gray-600" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 no-scrollbar bg-gray-50">
                                    {/* Delivery Address */}
                                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-gray-100 relative z-50">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
                                                <FaMapMarkerAlt className="text-orange-500" /> Delivery Address
                                            </h3>
                                            <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full font-medium border border-orange-100">
                                                Lahore Only
                                            </span>
                                        </div>

                                        {/* House Number */}
                                        <div className="mb-3">
                                            <label className="text-xs font-semibold text-gray-800 mb-1.5 block">
                                                House / Flat / Building No.
                                            </label>
                                            <input
                                                type="text"
                                                value={houseNumber}
                                                onChange={(e) => setHouseNumber(e.target.value)}
                                                placeholder="e.g., House 123, Flat 4B"
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-sm text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* Area / Block */}
                                        <div className="relative">
                                            <label className="text-xs font-semibold text-gray-800 mb-1.5 block">
                                                Area / Block / Street
                                            </label>
                                            <input
                                                type="text"
                                                value={deliveryAddress}
                                                onChange={(e) => handleAddressSearch(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setShowSuggestions(false);
                                                    }
                                                }}
                                                onFocus={() => {
                                                    if (deliveryAddress.length > 2 && suggestions.length > 0) setShowSuggestions(true);
                                                }}
                                                onBlur={handleAddressBlur}
                                                placeholder="Type area/block (e.g., Allama Iqbal Town)"
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-sm pr-10 text-gray-900 placeholder:text-gray-400"
                                            />
                                            {deliveryAddress && (
                                                <button
                                                    onClick={() => {
                                                        setDeliveryAddress('');
                                                        setDeliveryLocation(null);
                                                        setDistance(null);
                                                        setSuggestions([]);
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                                                >
                                                    <FaTimes size={14} />
                                                </button>
                                            )}

                                            {showSuggestions && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-[100]">
                                                    {loadingAddress ? (
                                                        <div className="p-4 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                                                            <ModernLoader size="sm" />
                                                            Searching...
                                                        </div>
                                                    ) : suggestions.length > 0 ? (
                                                        <>
                                                            {suggestions.map((feature: any, idx: number) => {
                                                                const props = feature.properties;
                                                                const addressParts = [
                                                                    props.name,
                                                                    props.street,
                                                                    props.district,
                                                                    props.city || props.county,
                                                                    props.state
                                                                ].filter(Boolean);
                                                                const displayAddress = addressParts.join(', ');

                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            setDeliveryAddress(displayAddress);
                                                                            // Save coordinates
                                                                            if (feature.geometry && feature.geometry.coordinates) {
                                                                                setDeliveryLocation({
                                                                                    lat: feature.geometry.coordinates[1],
                                                                                    lng: feature.geometry.coordinates[0]
                                                                                });
                                                                            }
                                                                            setShowSuggestions(false);
                                                                        }}
                                                                        className="p-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-3 transition-colors"
                                                                    >
                                                                        <FaMapMarkerAlt className="text-orange-500 mt-1 shrink-0 text-sm" />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-semibold text-gray-900 truncate">{props.name || props.street}</p>
                                                                            <p className="text-xs text-gray-600 truncate">{displayAddress}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    ) : deliveryAddress.length > 2 ? (
                                                        <div className="p-4 text-center text-gray-600 text-sm">
                                                            <p className="font-semibold">No suggestions found</p>
                                                            <p className="text-xs text-gray-500 mt-1">You can type your address manually</p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Estimated Delivery */}
                                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FaClock className="text-blue-500 text-lg" />
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 text-base">Estimated Delivery</h3>
                                                    <p className="text-sm text-gray-700 font-medium">25-35 minutes</p>
                                                </div>
                                            </div>
                                            <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-medium border border-green-100">
                                                Fast Delivery
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-base">
                                            <FaCreditCard className="text-purple-500" /> Payment Method
                                        </h3>
                                        <div className="space-y-2">
                                                {/* Card Selection */}
                                                {settings?.featureToggles?.enableSafepay !== false && (
                                                    <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${paymentMethod === 'card' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-9 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
                                                                    VISA
                                                                </div>
                                                                <div className="w-9 h-6 bg-red-500 rounded flex items-center justify-center">
                                                                    <div className="flex -space-x-1">
                                                                        <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
                                                                        <div className="w-3 h-3 rounded-full bg-orange-400 border border-white"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-900 text-sm">Credit/Debit Card</span>
                                                                <p className="text-[10px] text-gray-500">Secure via Safepay</p>
                                                            </div>
                                                        </div>
                                                        <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => { setPaymentMethod('card'); setPaymentStep('selection'); }} className="w-4 h-4 text-orange-500 border-gray-300" />
                                                    </label>
                                                )}

                                                {/* Cash on Delivery */}
                                                {settings?.featureToggles?.enableCOD !== false && (
                                                    <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${paymentMethod === 'cod' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                                                                <FaMoneyBillWave className="text-green-600" />
                                                            </div>
                                                            <span className="font-medium text-gray-900 text-sm">Cash on Delivery</span>
                                                        </div>
                                                        <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => { setPaymentMethod('cod'); setPaymentStep('selection'); }} className="w-4 h-4 text-orange-500 border-gray-300" />
                                                    </label>
                                                )}

                                                {/* Digital Wallets - Expandable */}
                                                {(settings?.featureToggles?.enableJazzCash !== false || settings?.featureToggles?.enableEasyPaisa !== false) && (
                                                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                                        <div className="flex items-center justify-between p-4 bg-white">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                                                    <FaWallet className="text-purple-600" />
                                                                </div>
                                                                <span className="font-medium text-gray-900 text-sm">Digital Wallets</span>
                                                            </div>
                                                            <svg className="w-5 h-5 text-gray-400 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </div>

                                                        {/* JazzCash */}
                                                        {settings?.featureToggles?.enableJazzCash !== false && (
                                                            <label className={`flex items-center justify-between p-4 border-t-2 border-gray-100 cursor-pointer transition ${paymentMethod === 'jazzcash' ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white font-bold text-xs">
                                                                        JC
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium text-gray-900 text-sm">JazzCash</span>
                                                                        <p className="text-[10px] text-gray-500">Secure via Safepay</p>
                                                                    </div>
                                                                </div>
                                                                <input type="radio" name="payment" value="jazzcash" checked={paymentMethod === 'jazzcash'} onChange={() => { setPaymentMethod('jazzcash'); setPaymentStep('selection'); }} className="w-4 h-4 text-orange-500 border-gray-300" />
                                                            </label>
                                                        )}

                                                        {/* EasyPaisa */}
                                                        {settings?.featureToggles?.enableEasyPaisa !== false && (
                                                            <label className={`flex items-center justify-between p-4 border-t-2 border-gray-100 cursor-pointer transition ${paymentMethod === 'easypaisa' ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-xs">
                                                                        EP
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium text-gray-900 text-sm">EasyPaisa</span>
                                                                        <p className="text-[10px] text-gray-500">Secure via Safepay</p>
                                                                    </div>
                                                                </div>
                                                                <input type="radio" name="payment" value="easypaisa" checked={paymentMethod === 'easypaisa'} onChange={() => { setPaymentMethod('easypaisa'); setPaymentStep('selection'); }} className="w-4 h-4 text-orange-500 border-gray-300" />
                                                            </label>
                                                        )}
                                                    </div>
                                                )}

                                                    {/* Safepay Redirect Message */}
                                                    {paymentMethod !== 'cod' && paymentMethod !== 'card' && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="p-4 bg-orange-50 border-t-2 border-orange-100 flex items-center gap-3"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                                <FaCheckCircle className="text-orange-600 text-sm" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-bold text-gray-800">Professional Gateway</p>
                                                                <p className="text-[10px] text-gray-500">Redirecting to Safepay for secure payment.</p>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>

                                    {/* Promo Code */}
                                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
                                            <FaGift className="text-pink-500" /> Promo Code
                                        </h3>

                                        {!appliedVoucher ? (
                                            <>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={promoCode}
                                                        onChange={(e) => {
                                                            setPromoCode(e.target.value.toUpperCase());
                                                            setVoucherError('');
                                                        }}
                                                        placeholder="Enter code"
                                                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-sm uppercase text-gray-900 placeholder:text-gray-400"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleApplyPromoCode();
                                                        }}
                                                    />
                                                    <button
                                                        onClick={handleApplyPromoCode}
                                                        disabled={applyingVoucher || !promoCode.trim()}
                                                        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {applyingVoucher ? 'Applying...' : 'Apply'}
                                                    </button>
                                                </div>
                                                {voucherError && (
                                                    <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1">
                                                        <span>❌</span> {voucherError}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-green-700 text-sm flex items-center gap-2">
                                                        <span>✅</span> {appliedVoucher.code} Applied!
                                                    </p>
                                                    <p className="text-xs text-green-700 font-medium mt-0.5">
                                                        {appliedVoucher.discount}% off • Saving Rs. {discountAmount.toLocaleString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleRemoveVoucher}
                                                    className="text-green-700 hover:text-green-900 text-sm font-bold"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Delivery Instructions */}
                                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
                                            <FaEdit className="text-orange-500" /> Delivery Instructions
                                        </h3>
                                        <textarea
                                            value={deliveryInstructions}
                                            onChange={(e) => setDeliveryInstructions(e.target.value)}
                                            placeholder="e.g. Ring doorbell, leave at gate..."
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition h-24 resize-none text-sm text-gray-900 placeholder:text-gray-400"
                                        />
                                    </div>

                                    {/* Bill Details */}
                                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-4 text-base">Bill Details</h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between text-gray-800 font-medium">
                                                <span>Subtotal</span>
                                                <span>Rs. {subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-800 font-medium">
                                                <div className="flex flex-col">
                                                    <span>Delivery Fee</span>
                                                    {distance !== null && (
                                                        <span className="text-[10px] text-gray-500 font-normal">
                                                            Distance: {distance.toFixed(1)} km
                                                        </span>
                                                    )}
                                                </div>
                                                <span>Rs. {calculatedFee.toLocaleString()}</span>
                                            </div>
                                            {serviceFee > 0 && (
                                                <div className="flex justify-between text-gray-800 font-medium">
                                                    <span>Service Fee</span>
                                                    <span>Rs. {serviceFee.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {isTaxEnabled && (
                                                <div className="flex justify-between text-gray-800 font-medium">
                                                    <span>Tax ({taxRate}%)</span>
                                                    <span>Rs. {calculatedTax.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {appliedVoucher && (
                                                <div className="flex justify-between text-green-700 font-bold">
                                                    <span>Discount ({appliedVoucher.discount}%)</span>
                                                    <span>- Rs. {discountAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                                                <span className="font-bold text-gray-900 text-base">Total</span>
                                                <span className="font-bold text-orange-500 text-xl">Rs. {currentTotal.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer - Place Order Button */}
                                <div className="absolute bottom-0 left-0 w-full p-5 bg-white border-t border-gray-100">
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={loading}
                                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white font-bold text-base shadow-lg hover:shadow-xl transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex justify-between px-6 items-center"
                                    >
                                        <span>{loading ? 'Placing Order...' : 'Place Order'}</span>
                                        <span>Rs. {currentTotal.toLocaleString()}</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </>
            )}

            {/* Phone Authentication Modal */}
            <PhoneAuthModal
                isOpen={showPhoneAuth}
                onClose={() => setShowPhoneAuth(false)}
                onSuccess={async () => {
                    console.log('Phone verification successful, proceeding with order...');
                    setPhoneVerified(true);
                    setShowPhoneAuth(false);

                    // Update localStorage immediately
                    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                    userInfo.phoneVerified = true;
                    localStorage.setItem('userInfo', JSON.stringify(userInfo));

                    // Wait a moment for state to update, then place order
                    await new Promise(resolve => setTimeout(resolve, 300));
                    handlePlaceOrder();
                }}
            />
        </AnimatePresence>
    );
}
