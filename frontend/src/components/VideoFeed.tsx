'use client';

// Force Redeploy for "es" error fix - 2026-01-24 15:00

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { FaHeart, FaComment, FaShare, FaShoppingCart, FaFilter, FaStar, FaTimes, FaPaperPlane, FaBars, FaChevronRight, FaSearch, FaMapMarkerAlt, FaPlay, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import axios from 'axios';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

const DishDetails = dynamic(() => import('./DishDetails'), { ssr: false });
const RestaurantProfile = dynamic(() => import('./RestaurantProfile'), { ssr: false });
const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });
const NavDrawer = dynamic(() => import('./NavDrawer'), { ssr: false });
const RiderRatingModal = dynamic(() => import('./RiderRatingModal'), { ssr: false });
const OrderTracking = dynamic(() => import('./OrderTracking'), { ssr: false });
const LocationPermission = dynamic(() => import('./LocationPermission'), { ssr: false });
const ProfileModal = dynamic(() => import('./ProfileModal'), { ssr: false });
import VideoCard, { Dish } from './VideoCard';

import { getImageUrl, getImageFallback } from '../utils/imageUtils';
import { useCart } from '@/context/CartContext';
import { getApiUrl } from '../utils/config';
import { initSocket, subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import toast from 'react-hot-toast';

// VideoCard extracted to ./VideoCard
// import VideoCard from './VideoCard';


export default function VideoFeed() {
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const dishIdFromUrl = searchParams.get('dishId');
    const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);
    const { cartCount } = useCart();
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Coffee', 'Desserts', 'Fast Food'];

    const filteredDishes = useMemo(() => {
        if (!Array.isArray(dishes)) return [];
        const term = searchTerm.toLowerCase();
        return dishes.filter(dish => {
            return dish.name?.toLowerCase().includes(term) ||
                dish.restaurant?.name?.toLowerCase().includes(term) ||
                dish.description?.toLowerCase().includes(term) ||
                dish.ingredients?.some(ing => ing.toLowerCase().includes(term));
        });
    }, [dishes, searchTerm]);


    const fetchActiveOrder = async () => {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) return;
            const userInfo = JSON.parse(userInfoStr);
            if (!userInfo.token) return;

            const res = await axios.get(`${getApiUrl()}/api/orders/user/active`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            if (res.data && res.data.length > 0) {
                setActiveOrder(res.data[0]); // Take the most recent active order
            } else {
                setActiveOrder(null);
            }
        } catch (error) {
            console.error('Error fetching active order:', error);
        }
    };

    useEffect(() => {
        fetchActiveOrder();
        // Poll for active orders every 30 seconds
        const interval = setInterval(fetchActiveOrder, 30000);

        // Real-time listener for order updates
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
            try {
                const userInfo = JSON.parse(userInfoStr);
                if (userInfo._id) {
                    initSocket(userInfo._id, 'user');
                    const userChannelName = `user-${userInfo._id}`;
                    const userChannel = subscribeToChannel(userChannelName);

                    if (userChannel) {
                        userChannel.bind('orderStatusUpdate', (updatedOrder: any) => {
                            console.log('📦 Real-time order update:', updatedOrder.status);

                            // If order is delivered, show rating modal
                            if (updatedOrder.status === 'Delivered') {
                                console.log('✅ Order delivered! Showing rating modal...');
                                setRatingOrderId(updatedOrder._id);
                                setTimeout(() => {
                                    setShowRatingModal(true);
                                }, 2000);
                            }

                            // Refresh active orders list
                            fetchActiveOrder();
                        });

                        userChannel.bind('riderArrived', (data: any) => {
                            toast.success('📍 Your rider has arrived!');
                        });
                    }

                    // Real-time feed updates
                    const feedChannelName = 'public-feed';
                    const feedChannel = subscribeToChannel(feedChannelName);
                    if (feedChannel) {
                        feedChannel.bind('new_dish', (newDish: Dish) => {
                            console.log('✨ New dish received via socket:', newDish.name);
                            setDishes(prev => [newDish, ...prev]);
                        });
                        feedChannel.bind('dish_updated', (updatedDish: Dish) => {
                            console.log('🔄 Dish updated via socket:', updatedDish.name);
                            setDishes(prev => prev.map(d => d._id === updatedDish._id ? updatedDish : d));
                        });
                    }

                    return () => {
                        unsubscribeFromChannel(userChannelName);
                        unsubscribeFromChannel(feedChannelName);
                        clearInterval(interval);
                    };
                }
            } catch (e) {
                console.error('Error setting up real-time listener:', e);
            }
        }

        return () => clearInterval(interval);
    }, []);

    const fetchDishes = useCallback(async (searchQuery?: string, category?: string) => {
        try {
            const loc = userLocation || (localStorage.getItem('userLocation') ? JSON.parse(localStorage.getItem('userLocation')!) : null);
            let queryParams = loc ? `?lat=${loc.latitude}&lng=${loc.longitude}` : '';

            const activeSearch = searchQuery ?? searchTerm;
            const activeCategory = category ?? selectedCategory;

            if (activeSearch) {
                queryParams += (queryParams ? '&' : '?') + `search=${encodeURIComponent(activeSearch)}`;
            }

            if (activeCategory && activeCategory !== 'All') {
                queryParams += (queryParams ? '&' : '?') + `category=${encodeURIComponent(activeCategory)}`;
            }

            console.log('📡 Fetching videos from:', `${getApiUrl()}/api/videos/feed${queryParams}`);
            const res = await axios.get(`${getApiUrl()}/api/videos/feed${queryParams}`);
            console.log('📡 Feed Response:', res.status, 'Videos:', res.data?.videos?.length);

            if (res.data && res.data.videos) {
                setDishes(res.data.videos);

                // If we have items in cart, but the feed is empty and no filters are active,
                // it means there are no restaurants in the system. Clear the cart to avoid stale items.
                if (res.data.videos.length === 0 && !activeSearch && activeCategory === 'All') {
                    console.log('🧹 No restaurants found in system. Clearing stale cart.');
                    const savedCart = localStorage.getItem('foodswipe_cart');
                    if (savedCart && JSON.parse(savedCart).length > 0) {
                        localStorage.removeItem('foodswipe_cart');
                        window.dispatchEvent(new Event('cartCleared'));
                    }
                }
            } else {
                console.warn('No videos found in feed response:', res.data);
                setDishes([]);
            }
        } catch (error: any) {
            console.error('❌ Error fetching dishes:', error.message, error.response?.data);
        }
    }, [userLocation, searchTerm, selectedCategory]);

    useEffect(() => {
        // Fallback polling to refresh dishes every 30 seconds
        const interval = setInterval(() => {
            // We don't pass arguments, so it uses the current state for search/category
            fetchDishes();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchDishes]); // Rerun if fetchDishes changes (e.g., due to filter changes)

    const handleTrackOrder = (orderId: string) => {
        setSelectedOrderId(orderId);
        setShowTrackingModal(true);
    };

    useEffect(() => {
        // Initial fetch
        fetchDishes();

        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) setUser(JSON.parse(userInfo));
        const savedLocation = localStorage.getItem('userLocation');
        if (savedLocation) {
            setUserLocation(JSON.parse(savedLocation));
        } else {
            setTimeout(() => setShowLocationPrompt(true), 1500);
        }
    }, []); // Only run once on mount

    // Handle jumping to shared dish
    useEffect(() => {
        if (dishIdFromUrl && filteredDishes.length > 0 && scrollContainerRef.current) {
            const index = filteredDishes.findIndex(d => d._id === dishIdFromUrl);
            if (index !== -1) {
                console.log('🎯 Found shared dish at index:', index);
                setCurrentVideoIndex(index);
                // Wait for layout to settle then scroll
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        const vh = scrollContainerRef.current.clientHeight;
                        scrollContainerRef.current.scrollTo({
                            top: index * vh,
                            behavior: 'auto'
                        });
                    }
                }, 300); // Increased timeout slightly to ensure render
            }
        }
    }, [dishIdFromUrl, filteredDishes.length]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchDishes(searchTerm, selectedCategory);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, selectedCategory, fetchDishes]);

    useEffect(() => {
        const handleCartOpen = () => setIsCartOpen(true);
        window.addEventListener('openCart', handleCartOpen);
        return () => window.removeEventListener('openCart', handleCartOpen);
    }, []);

    const handleAllowLocation = () => {
        setShowLocationPrompt(false);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    console.log('📍 Initial location:', latitude, longitude);
                    const location = { latitude, longitude };
                    setUserLocation(location);
                    localStorage.setItem('userLocation', JSON.stringify(location));
                },
                (error) => {
                    console.error('Location error:', error);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    };

    const handleDenyLocation = () => {
        setShowLocationPrompt(false);
    };

    useEffect(() => {
        let watchId: number | null = null;

        const startWatching = () => {
            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        console.log('📍 Location updated:', latitude, longitude);
                        const location = { latitude, longitude };
                        setUserLocation(location);
                        localStorage.setItem('userLocation', JSON.stringify(location));
                    },
                    (error) => {
                        console.error('Location watch error:', error);
                    },
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
                );
            }
        };

        if (userLocation || localStorage.getItem('userLocation')) {
            startWatching();
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, []); // Run on mount to catch saved location or after first fix

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
        // Debug distance calculation
        if (window.location.hostname !== 'localhost' || process.env.NODE_ENV === 'development') {
            console.log(`📐 Distance Debug: User[${lat1.toFixed(4)}, ${lon1.toFixed(4)}] Rest[${lat2.toFixed(4)}, ${lon2.toFixed(4)}]`);
        }

        // If restaurant location is 0,0 or very far, it's likely not set
        if ((lat2 === 0 && lon2 === 0) || (Math.abs(lat2) < 0.1 && Math.abs(lon2) < 0.1)) {
            return 'Location not set';
        }

        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance >= 1) {
            return distance.toFixed(1) + ' km';
        }
        return (distance * 1000).toFixed(0) + ' m';
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const height = container.clientHeight;
        if (height <= 0) return;

        const index = Math.round(container.scrollTop / height);
        if (index !== currentVideoIndex && index >= 0 && index < filteredDishes.length) {
            setCurrentVideoIndex(index);
        }
    };

    useEffect(() => {
        setCurrentVideoIndex(0);
        // Also scroll to top of the container if possible
        const container = document.querySelector('.snap-y');
        if (container) container.scrollTop = 0;
    }, [searchTerm]);

    const handleOpenDetails = useCallback((dish: Dish) => {
        setSelectedDish(dish);
    }, []);

    const handleOpenProfile = useCallback((restaurant: any) => {
        setSelectedRestaurant(restaurant);
    }, []);



    return (
        <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
            <div className="fixed top-[env(safe-area-inset-top,1rem)] left-0 right-0 z-[50] px-4">
                <div className="flex items-center gap-2 max-w-2xl mx-auto">
                    <button onClick={() => setIsNavOpen(true)} className="p-2.5 text-white flex-shrink-0 cursor-pointer z-50 bg-white/10 backdrop-blur-md rounded-xl border border-white/10" type="button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 relative group">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#FF6A00] transition-colors" size={12} />
                            <input
                                type="text"
                                placeholder="Search dishes or restaurants..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white pl-9 pr-8 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/50 focus:border-[#FF6A00] transition-all placeholder:text-white/40 text-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    <FaTimes size={12} />
                                </button>
                            )}
                        </div>

                        {/* Category Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border border-white/10 backdrop-blur-md ${selectedCategory !== 'All' ? 'bg-[#FF6A00] text-white border-[#FF6A00]' : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                <span className="max-w-[60px] truncate">{selectedCategory === 'All' ? 'Menu' : selectedCategory}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            <AnimatePresence>
                                {isCategoryDropdownOpen && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setIsCategoryDropdownOpen(false)}
                                            className="fixed inset-0 z-40 bg-black/20"
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-2 w-40 bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            <div className="py-1 max-h-[300px] overflow-y-auto no-scrollbar">
                                                {CATEGORIES.map((cat) => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => {
                                                            setSelectedCategory(cat);
                                                            setIsCategoryDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${selectedCategory === cat
                                                            ? 'bg-[#FF6A00] text-white font-bold'
                                                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <button onClick={() => { console.log('🛒 Cart clicked!'); setIsCartOpen(true); }} className="p-2 text-white flex-shrink-0 cursor-pointer z-50 bg-white/10 backdrop-blur-md rounded-lg relative" type="button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-[#FF6A00] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-black">{cartCount}</span>}
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-behavior-y-contain touch-pan-y"
                onScroll={handleScroll}
                style={{
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                    scrollPaddingTop: 'env(safe-area-inset-top)',
                    scrollPaddingBottom: 'env(safe-area-inset-bottom)'
                }}
            >
                {filteredDishes.map((dish, index) => {
                    let distance: string | undefined;
                    const normalizeCoords = (coords?: [number, number]) => {
                        if (!coords || coords.length < 2) return null;
                        const a = coords[0], b = coords[1];
                        if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lon: a }; // GeoJSON -> lat,lon
                        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b }; // Already lat,lon
                        return null;
                    };
                    const compute = (ul?: { latitude: number, longitude: number }) => {
                        if (!ul || !dish.restaurant?.location?.coordinates) return undefined;
                        const norm = normalizeCoords(dish.restaurant.location.coordinates as any);
                        if (!norm) return 'Location not set';
                        const km = calculateDistance(ul.latitude, ul.longitude, norm.lat, norm.lon);
                        if (!km || km === 'Location not set') return km as any;
                        const num = typeof km === 'string' && km.endsWith(' km') ? parseFloat(km) : undefined;
                        if (typeof num === 'number' && num > 1000) return 'Distance unavailable';
                        return km as any;
                    };
                    distance = compute(userLocation || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('userLocation') || 'null') : null));
                    return (
                        <VideoCard
                            key={dish._id}
                            dish={dish}
                            isActive={index === currentVideoIndex}
                            isNext={index === currentVideoIndex + 1}
                            onOpenDetails={handleOpenDetails}
                            onOpenProfile={handleOpenProfile}
                            distance={distance}
                            user={user}
                        />
                    );
                })}
                {filteredDishes.length === 0 && (
                    <div className="h-[100dvh] flex flex-col items-center justify-center text-white bg-gray-900 px-6 text-center">
                        {searchTerm ? (
                            <>
                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                                    <FaSearch className="text-gray-400 text-2xl" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">No results found</h3>
                                <p className="text-gray-400 max-w-xs">We couldn't find any dishes or restaurants matching "{searchTerm}"</p>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-6 text-[#FF6A00] font-medium hover:underline"
                                >
                                    Clear search
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-lg font-medium animate-pulse">Finding delicious food...</p>
                            </>
                        )}
                    </div>
                )}
            </div>
            <AnimatePresence>
                {selectedDish && <DishDetails dish={selectedDish} onClose={() => setSelectedDish(null)} />}
                {selectedRestaurant && <RestaurantProfile restaurant={selectedRestaurant} onBack={() => setSelectedRestaurant(null)} />}
            </AnimatePresence>
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onTrackOrder={handleTrackOrder} />
            <NavDrawer
                isOpen={isNavOpen}
                onClose={() => setIsNavOpen(false)}
                user={user}
                onOpenProfile={() => setIsUserProfileOpen(true)}
                activeOrderId={activeOrder?._id}
            />
            <ProfileModal isOpen={isUserProfileOpen} onClose={() => setIsUserProfileOpen(false)} user={user} />
            <OrderTracking isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} orderId={selectedOrderId || ''} />
            {showRatingModal && ratingOrderId && (
                <RiderRatingModal
                    isOpen={showRatingModal}
                    onClose={() => setShowRatingModal(false)}
                    orderId={ratingOrderId}
                />
            )}
            {showLocationPrompt && <LocationPermission onAllow={handleAllowLocation} onDeny={handleDenyLocation} />}
        </div>
    );
}
