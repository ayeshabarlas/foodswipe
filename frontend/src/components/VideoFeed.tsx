'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaHeart, FaComment, FaShare, FaShoppingCart, FaFilter, FaStar, FaTimes, FaPaperPlane, FaBars, FaChevronRight, FaSearch, FaMapMarkerAlt, FaPlay, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import axios from 'axios';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
const DishDetails = dynamic(() => import('./DishDetails'), { ssr: false });
const RestaurantProfile = dynamic(() => import('./RestaurantProfile'), { ssr: false });
const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });
const NavDrawer = dynamic(() => import('./NavDrawer'), { ssr: false });
const RiderRatingModal = dynamic(() => import('./RiderRatingModal'), { ssr: false });
import dynamic from 'next/dynamic';

const OrderTracking = dynamic(() => import('./OrderTracking'), { ssr: false });
import LocationPermission from './LocationPermission';
import ProfileModal from './ProfileModal';
import { getImageUrl, getImageFallback } from '../utils/imageUtils';
import { useCart } from '@/context/CartContext';
import { API_BASE_URL } from '../utils/config';
import { initSocket, subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import toast from 'react-hot-toast';

interface Dish {
    _id: string;
    name: string;
    description: string;
    price: number;
    videoUrl: string;
    imageUrl: string;
    ingredients?: string[];
    variants?: any[];
    combos?: any[];
    drinks?: any[];
    likes?: any[];
    shares?: number;
    restaurant: {
        _id: string;
        name: string;
        logo: string;
        rating: number;
        address: string;
        contact: string;
        location?: {
            type: string;
            coordinates: [number, number];
        };
    };
    activeDeals?: {
        _id: string;
        title: string;
        discount: number;
        discountType: 'percentage' | 'fixed';
        code: string;
    }[];
}

const VideoCard = React.memo(({
    dish,
    isActive,
    onOpenDetails,
    onOpenProfile,
    distance,
    isNext, // Add isNext prop for preloading
    user // Pass user down
}: {
    dish: Dish;
    isActive: boolean;
    onOpenDetails: (dish: Dish) => void;
    onOpenProfile: (restaurant: any) => void;
    distance?: string;
    isNext?: boolean;
    user: any;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [sharesCount, setSharesCount] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoading, setIsVideoLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const userId = user._id;
        const userLiked = dish.likes?.some((like: any) => (like._id || like) === userId);
        setIsLiked(!!userLiked);
        setLikesCount(dish.likes?.length || 0);
        setSharesCount(dish.shares || 0);
    }, [dish, user]);

    // Optimize video playback
    useEffect(() => {
        if (!videoRef.current) return;

        if (isActive) {
            setIsPlaying(true);
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    console.warn('❌ Autoplay prevented:', error);
                    setIsPlaying(false);
                });
            }
        } else {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, [isActive, dish.videoUrl]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    // Preload handling
    useEffect(() => {
        if (isNext && videoRef.current) {
            videoRef.current.preload = "auto";
        }
    }, [isNext]);

    const fetchComments = async () => {
        setLoadingComments(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/videos/${dish._id}/comments`);
            setComments(res.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    useEffect(() => {
        if (showComments) {
            fetchComments();
        }
    }, [showComments, dish._id]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            if (!user?.token) return alert('Please login to like');

            const res = await axios.post(`${API_BASE_URL}/api/videos/${dish._id}/like`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            setIsLiked(res.data.isLiked);
            setLikesCount(res.data.likes);
        } catch (error) {
            console.error('Like failed:', error);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await axios.post(`${API_BASE_URL}/api/videos/${dish._id}/share`);
            setSharesCount(prev => prev + 1);

            if (navigator.share) {
                navigator.share({
                    title: dish.name,
                    text: `Check out ${dish.name} from ${dish.restaurant.name}!`,
                    url: window.location.href
                });
            } else {
                alert('Link copied to clipboard!');
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        try {
            if (!user?.token) return alert('Please login to comment');

            const res = await axios.post(`${API_BASE_URL}/api/videos/${dish._id}/comment`, {
                text: commentText,
                rating: 5
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            setComments([res.data, ...comments]);
            setCommentText('');
        } catch (error) {
            console.error('Comment failed:', error);
            alert('Failed to post comment');
        }
    };

    const touchStart = useRef(0);
    const touchEnd = useRef(0);
    const isDragging = useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button, a, input, textarea, [role="button"]')) {
            return;
        }
        isDragging.current = true;
        touchStart.current = e.clientX;
        touchEnd.current = e.clientX;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging.current) {
            touchEnd.current = e.clientX;
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging.current) {
            return;
        }
        isDragging.current = false;
        const swipeDistance = touchStart.current - touchEnd.current;
        const threshold = 50;

        if (Math.abs(swipeDistance) < 10) {
            onOpenDetails(dish);
        } else if (Math.abs(swipeDistance) > threshold) {
            if (swipeDistance > 0) {
                onOpenDetails(dish);
            } else {
                onOpenProfile(dish.restaurant);
            }
        }
    };

    return (
        <div className="relative h-screen w-full snap-start snap-always bg-black flex-shrink-0 overflow-hidden" onClick={togglePlay}>
            <div className="absolute inset-0 z-0" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
                {dish.videoUrl ? (
                    <div className="relative w-full h-full">
                        <video
                            ref={videoRef}
                            src={getImageUrl(dish.videoUrl)}
                            className="w-full h-full object-contain"
                            loop
                            muted={isMuted}
                            playsInline
                            autoPlay={isActive}
                            webkit-playsinline="true"
                            preload={isActive ? "auto" : isNext ? "auto" : "metadata"}
                            poster={getImageUrl(dish.imageUrl)}
                            onLoadedData={() => setIsVideoLoading(false)}
                            onWaiting={() => setIsVideoLoading(true)}
                            onPlaying={() => setIsVideoLoading(false)}
                            onError={(e) => {
                                setIsVideoLoading(false);
                                const fullUrl = getImageUrl(dish.videoUrl);
                                console.error('❌ Video playback error:', {
                                    originalUrl: dish.videoUrl,
                                    resolvedUrl: fullUrl,
                                    error: e
                                });
                            }}
                        />
                        {isVideoLoading && isActive && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}
                        {!isPlaying && isActive && !isVideoLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                                <FaPlay className="text-white text-6xl opacity-70" />
                            </div>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                            className="absolute bottom-28 right-4 z-30 bg-black/20 p-2 rounded-full text-white backdrop-blur-sm"
                        >
                            {isMuted ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
                        </button>
                    </div>
                ) : (
                    <img
                        src={getImageUrl(dish.imageUrl) || getImageFallback('dish')}
                        alt={dish.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = getImageFallback('dish');
                        }}
                    />
                )}
            </div>

            <div className="absolute top-20 left-4 z-30 pointer-events-auto flex flex-col items-start gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile(dish.restaurant);
                    }}
                    className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 hover:bg-black/50 transition cursor-pointer"
                >
                    <img
                        src={getImageUrl(dish.restaurant.logo) || getImageFallback('logo')}
                        alt={dish.restaurant.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = getImageFallback('logo');
                        }}
                    />
                    <div className="flex flex-col text-left">
                        <p className="text-white font-bold text-sm">{dish.restaurant.name}</p>
                        {distance && (
                            <p className="text-white/80 text-xs">
                                {distance === 'Location not set' ? distance : `${distance} away`}
                            </p>
                        )}
                    </div>
                </button>

                {dish.activeDeals && dish.activeDeals.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2"
                    >
                        <span>🏷️ {dish.activeDeals.length} Active Deal{dish.activeDeals.length > 1 ? 's' : ''}</span>
                    </motion.div>
                )}
            </div>

            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-20 pointer-events-auto">
                <div className="flex flex-col items-center gap-1.5">
                    <button onClick={handleLike} className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90">
                        <FaHeart className={isLiked ? "text-red-500 text-xl" : "text-white text-xl"} />
                    </button>
                    <span className="text-white text-[11px] font-medium drop-shadow-lg">{likesCount}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90">
                        <FaComment className="text-white text-xl" />
                    </button>
                    <span className="text-white text-[11px] font-medium drop-shadow-lg">{comments.length > 0 ? comments.length : 'Comments'}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                    <button onClick={handleShare} className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90">
                        <FaShare className="text-white text-xl" />
                    </button>
                    <span className="text-white text-[11px] font-medium drop-shadow-lg">{sharesCount}</span>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 pb-8 text-white z-20 pointer-events-auto">
                <div className="flex items-end justify-between pr-20">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-1 leading-tight">{dish.name}</h2>
                        <p className="text-xs text-white/80 mb-4">{dish.description.substring(0, 60)}...</p>
                        <button onClick={(e) => { e.stopPropagation(); onOpenDetails(dish); }} className="bg-gradient-orange-red text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                            View Details & Ingredients
                            <FaChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="absolute bottom-0 left-0 w-full h-2/3 bg-gray-900 rounded-t-3xl z-40 p-4 flex flex-col shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                            <h3 className="text-lg font-bold text-white">Comments</h3>
                            <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                            {loadingComments ? (
                                <div className="text-center text-gray-400 py-4">Loading comments...</div>
                            ) : comments.length === 0 ? (
                                <div className="text-center text-gray-500 py-4">No comments yet. Be the first!</div>
                            ) : (
                                comments.map((c, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-orange-red flex items-center justify-center text-xs font-bold text-white shrink-0">
                                            {c.user?.name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-gray-300">{c.user?.name || 'User'}</p>
                                                <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-400">{c.comment}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <form onSubmit={handleAddComment} className="flex gap-2 mt-auto">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 bg-gray-800 rounded-full px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#FF6A00]"
                            />
                            <button type="submit" className="p-3 bg-gradient-orange-red rounded-full text-white hover:opacity-90 transition shadow-lg">
                                <FaPaperPlane />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

VideoCard.displayName = 'VideoCard';

export default function VideoFeed() {
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
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

    const fetchActiveOrder = async () => {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) return;
            const userInfo = JSON.parse(userInfoStr);
            if (!userInfo.token) return;

            const res = await axios.get(`${API_BASE_URL}/api/orders/user/active`, {
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
            
            console.log('📡 Fetching videos from:', `${API_BASE_URL}/api/videos/feed${queryParams}`);
            const res = await axios.get(`${API_BASE_URL}/api/videos/feed${queryParams}`);
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

    return (
        <div className="relative min-h-screen w-full bg-black">
            <div className="fixed top-4 left-0 right-0 z-[50] px-4">
                <div className="flex items-center gap-2 max-w-2xl mx-auto">
                    <button onClick={() => setIsNavOpen(true)} className="p-2 text-white flex-shrink-0 cursor-pointer z-50 bg-white/10 backdrop-blur-md rounded-lg" type="button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    
                    <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/10 backdrop-blur-md text-white placeholder-gray-300 rounded-lg px-4 py-2 pl-9 pr-8 outline-none focus:bg-white/20 transition text-sm border border-white/10" 
                            />
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
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
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border border-white/10 backdrop-blur-md ${
                                    selectedCategory !== 'All' ? 'bg-[#FF6A00] text-white border-[#FF6A00]' : 'bg-white/10 text-white hover:bg-white/20'
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
                                                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                                                            selectedCategory === cat 
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

            <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar" onScroll={handleScroll}>
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
                    <div className="h-screen flex flex-col items-center justify-center text-white bg-gray-900 px-6 text-center">
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
