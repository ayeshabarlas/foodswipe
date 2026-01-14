'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaHeart, FaComment, FaShare, FaShoppingCart, FaFilter, FaStar, FaTimes, FaPaperPlane, FaBars, FaChevronRight, FaSearch, FaMapMarkerAlt } from 'react-icons/fa';
import axios from 'axios';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import DishDetails from './DishDetails';
import RestaurantProfile from './RestaurantProfile';
import CartDrawer from './CartDrawer';
import NavDrawer from './NavDrawer';
import dynamic from 'next/dynamic';

const OrderTracking = dynamic(() => import('./OrderTracking'), { ssr: false });
import LocationPermission from './LocationPermission';
import ProfileModal from './ProfileModal';
import { getImageUrl, getImageFallback } from '../utils/imageUtils';
import { useCart } from '@/context/CartContext';
import { API_BASE_URL } from '../utils/config';

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

const VideoCard = ({
    dish,
    isActive,
    onOpenDetails,
    onOpenProfile,
    distance
}: {
    dish: Dish;
    isActive: boolean;
    onOpenDetails: (dish: Dish) => void;
    onOpenProfile: (restaurant: any) => void;
    distance?: string;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [sharesCount, setSharesCount] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);

    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('userInfo');
            if (saved) setUserInfo(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        if (isActive) {
            videoRef.current?.play().catch((error) => console.log('Autoplay prevented:', error));
        } else {
            videoRef.current?.pause();
            if (videoRef.current) videoRef.current.currentTime = 0;
        }
    }, [isActive]);

    useEffect(() => {
        if (!userInfo) return;
        const userId = userInfo._id;
        const userLiked = dish.likes?.some((like: any) => (like._id || like) === userId);
        setIsLiked(!!userLiked);
        setLikesCount(dish.likes?.length || 0);
        setSharesCount(dish.shares || 0);
    }, [dish, userInfo]);

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
            if (!userInfo?.token) return alert('Please login to like');

            const res = await axios.post(`${API_BASE_URL}/api/videos/${dish._id}/like`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
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
            if (!userInfo?.token) return alert('Please login to comment');

            const res = await axios.post(`${API_BASE_URL}/api/videos/${dish._id}/comment`, {
                text: commentText,
                rating: 5
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
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
        <div className="relative h-screen w-full snap-start snap-always bg-black flex-shrink-0 overflow-hidden">
            <div className="absolute inset-0 z-0" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
                {dish.videoUrl ? (
                    <video
                        ref={videoRef}
                        src={getImageUrl(dish.videoUrl)}
                        className="w-full h-full object-cover pointer-events-none"
                        loop
                        muted
                        playsInline
                        poster={getImageUrl(dish.imageUrl)}
                        onError={(e) => {
                            console.error('Video error:', dish.videoUrl);
                            const target = e.target as HTMLVideoElement;
                            // target.style.display = 'none'; // Don't hide, poster will show
                        }}
                    />
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
                        <button onClick={(e) => { e.stopPropagation(); onOpenDetails(dish); }} className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center gap-2">
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
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
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
                                className="flex-1 bg-gray-800 rounded-full px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <button type="submit" className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white hover:from-orange-600 hover:to-red-600 transition shadow-lg">
                                <FaPaperPlane />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function VideoFeed() {
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);
    const { cartCount } = useCart();
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
    const [activeOrder, setActiveOrder] = useState<any>(null);

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
        return () => clearInterval(interval);
    }, []);

    const handleTrackOrder = (orderId: string) => {
        setSelectedOrderId(orderId);
        setShowTrackingModal(true);
    };

    useEffect(() => {
        const fetchDishes = async () => {
            try {
                console.log('📡 Fetching videos from:', `${API_BASE_URL}/api/videos/feed`);
                const res = await axios.get(`${API_BASE_URL}/api/videos/feed`);
                console.log('📡 Feed Response:', res.status, 'Videos:', res.data?.videos?.length);
                if (res.data && res.data.videos) {
                    setDishes(res.data.videos);
                } else {
                    console.warn('No videos found in feed response:', res.data);
                    setDishes([]);
                }
            } catch (error: any) {
                console.error('❌ Error fetching dishes:', error.message, error.response?.data);
            }
        };
        fetchDishes();
        const refreshInterval = setInterval(() => {
            fetchDishes();
            console.log('📡 Feed refreshed - checking for new dishes');
        }, 30000);
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) setUser(JSON.parse(userInfo));
        const savedLocation = localStorage.getItem('userLocation');
        if (savedLocation) {
            setUserLocation(JSON.parse(savedLocation));
        } else {
            setTimeout(() => setShowLocationPrompt(true), 1500);
        }
        return () => clearInterval(refreshInterval);
    }, []);

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
        const index = Math.round(container.scrollTop / container.clientHeight);
        if (index !== currentVideoIndex) setCurrentVideoIndex(index);
    };

    return (
        <div className="relative min-h-screen w-full bg-black">
            <div className="fixed top-4 left-4 right-4 z-[50] flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsNavOpen(true)} className="p-2 text-white flex-shrink-0 cursor-pointer z-50" type="button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div className="flex-1 relative">
                        <input type="text" placeholder="Search restaurants or dishes" className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 rounded-lg px-4 py-2.5 pl-10 outline-none focus:bg-white/15 transition text-sm" />
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                    <button onClick={() => { console.log('🛒 Cart clicked!'); setIsCartOpen(true); }} className="p-2 text-white flex-shrink-0 cursor-pointer z-50" type="button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</span>}
                    </button>
                </div>
            </div>

            <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar" onScroll={handleScroll}>
                {Array.isArray(dishes) && dishes.map((dish, index) => {
                    let distance: string | undefined;
                    if (userLocation && dish.restaurant?.location?.coordinates) {
                        const [restLng, restLat] = dish.restaurant.location.coordinates;
                        distance = calculateDistance(userLocation.latitude, userLocation.longitude, restLat, restLng);
                    }
                    return <VideoCard key={dish._id} dish={dish} isActive={index === currentVideoIndex} onOpenDetails={setSelectedDish} onOpenProfile={setSelectedRestaurant} distance={distance} />;
                })}
                {dishes.length === 0 && (
                    <div className="h-screen flex flex-col items-center justify-center text-white bg-gray-900">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lg font-medium animate-pulse">Finding delicious food...</p>
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
                onOpenProfile={() => setIsProfileOpen(true)}
                activeOrderId={activeOrder?._id}
            />
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} />
            <OrderTracking isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} orderId={selectedOrderId} />
            {showLocationPrompt && <LocationPermission onAllow={handleAllowLocation} onDeny={handleDenyLocation} />}
        </div>
    );
}
