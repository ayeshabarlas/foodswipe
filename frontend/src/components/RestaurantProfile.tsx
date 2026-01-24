'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaBars, FaSearch, FaShoppingCart, FaStar, FaMapMarkerAlt, FaClock, FaPlay, FaTicketAlt, FaComment, FaUser, FaQuoteLeft, FaTimes } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useSwipeBack } from '../hooks/useSwipeBack';
import DishDetails from './DishDetails';
import { getImageUrl, getImageFallback } from '../utils/imageUtils';
import { getApiUrl } from '../utils/config';
import { getSocket, initSocket, subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';

interface Dish {
    _id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    videoUrl: string;
    restaurant: any;
    ingredients?: string[];
    discount?: number;
}

interface MenuSection {
    name: string;
    type: 'auto' | 'restaurant';
    items: Dish[];
}

interface Review {
    _id: string;
    user: {
        _id: string;
        name: string;
    };
    dish?: {
        _id: string;
        name: string;
        imageUrl: string;
    };
    rating: number;
    comment: string;
    createdAt: string;
}

interface Restaurant {
    _id: string;
    name: string;
    logo: string;
    coverImage?: string;
    rating: number;
    address: string;
    contact: string;
    cuisine?: string;
    cuisineTypes?: string[];
    deliveryTime?: string;
    distance?: string;
    reviewCount?: number;
    isActive?: boolean;
    location?: {
        type: string;
        coordinates: number[];
    };
    storeStatus?: 'open' | 'closed' | 'busy';
}

interface RestaurantProfileProps {
    restaurant: Restaurant;
    onBack: () => void;
}

export default function RestaurantProfile({ restaurant: initialRestaurant, onBack }: RestaurantProfileProps) {
    useEffect(() => {
        console.log("RESTAURANT PROFILE LOADED V2 - CHECKING FOR UPDATES");
    }, []);

    const [restaurantData, setRestaurantData] = useState<Restaurant>(initialRestaurant);
    const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
    const [activeMainTab, setActiveMainTab] = useState<'videos' | 'menu'>('videos');
    const [activeTab, setActiveTab] = useState('Popular'); // Default to first section
    const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [vouchers, setVouchers] = useState<any[]>([]);

    const [deals, setDeals] = useState<any[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [distance, setDistance] = useState<string>('Calculating...');
    const { addToCart, cartCount, cartTotal, applyVoucher, appliedVoucher } = useCart();
    const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);

    const handleCopyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedVoucherId(id);
        setTimeout(() => setCopiedVoucherId(null), 2000);
    };

    // Auto-apply best voucher
    useEffect(() => {
        if (vouchers.length > 0 && cartCount > 0) {
            // Find valid vouchers
            const validVouchers = vouchers.filter(v => {
                const expiry = new Date(v.expiryDate);
                const now = new Date();
                expiry.setHours(23, 59, 59, 999);
                return v.isActive && expiry >= now && cartTotal >= v.minimumAmount;
            });

            if (validVouchers.length > 0) {
                // Sort by highest discount
                const bestVoucher = validVouchers.sort((a, b) => b.discount - a.discount)[0];

                // Only apply if different from current
                if (!appliedVoucher || appliedVoucher.code !== bestVoucher.code) {
                    applyVoucher({
                        code: bestVoucher.code,
                        discount: bestVoucher.discount,
                        type: 'percentage', // Assuming percentage for now based on UI
                        minimumAmount: bestVoucher.minimumAmount
                    });
                }
            }
        }
    }, [vouchers, cartTotal, cartCount, appliedVoucher, applyVoucher]);

    // Enable swipe back gesture
    useSwipeBack({ onSwipeBack: onBack });

    // Calculate distance from user's location to restaurant
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        // Debug distance calculation
        if (window.location.hostname !== 'localhost' || process.env.NODE_ENV === 'development') {
            console.log(`📐 Distance Debug (Profile): User[${lat1.toFixed(4)}, ${lon1.toFixed(4)}] Rest[${lat2.toFixed(4)}, ${lon2.toFixed(4)}]`);
        }

        // If restaurant location is 0,0 or very far, it's likely not set
        if ((lat2 === 0 && lon2 === 0) || (Math.abs(lat2) < 0.1 && Math.abs(lon2) < 0.1)) {
            return 'Location not set';
        }

        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (!isFinite(distance) || distance < 0) return 'Distance unavailable';
        if (distance > 1000) return 'Distance unavailable';

        if (distance >= 1) {
            return distance.toFixed(1) + ' km';
        }
        return (distance * 1000).toFixed(0) + ' m';
    };

    const normalizeCoords = (coords?: number[]) => {
        if (!coords || coords.length < 2) return null;
        const a = coords[0], b = coords[1];
        // If looks like [lon, lat] (GeoJSON), swap to [lat, lon]
        if (Math.abs(b) <= 90 && Math.abs(a) <= 180) {
            return { lat: b, lon: a };
        }
        // If looks like [lat, lon]
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
            return { lat: a, lon: b };
        }
        return null;
    };

    // Get user's location and calculate distance
    useEffect(() => {
        if (navigator.geolocation && restaurantData?.location?.coordinates) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLon = position.coords.longitude;
                    const norm = normalizeCoords(restaurantData.location!.coordinates);
                    
                    if (!norm) {
                        setDistance('Location not set');
                        return;
                    }
                    
                    console.log('📍 Distance Calculation Debug:', {
                        user: { lat: userLat, lon: userLon },
                        restaurant: { lat: norm.lat, lon: norm.lon },
                        restaurantAddress: restaurantData.address
                    });

                    // Ensure we are passing coordinates in the correct order: lat1, lon1, lat2, lon2
                    const dist = calculateDistance(userLat, userLon, norm.lat, norm.lon);
                    setDistance(dist);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    try {
                        const saved = localStorage.getItem('userLocation');
                        if (saved) {
                            const parsed = JSON.parse(saved);
                            const norm = normalizeCoords(restaurantData.location!.coordinates);
                            if (norm && parsed?.latitude && parsed?.longitude) {
                                const dist = calculateDistance(parsed.latitude, parsed.longitude, norm.lat, norm.lon);
                                setDistance(dist);
                                return;
                            }
                        }
                    } catch (_) {}
                    setDistance('Distance unavailable');
                }
            );
        } else {
            setDistance('Location not set');
        }
    }, [restaurantData]);

    useEffect(() => {
        const fetchRestaurantDetails = async () => {
            try {
                const res = await axios.get(`${getApiUrl()}/api/restaurants/${initialRestaurant._id}`);
                if (res.data) {
                    setRestaurantData(prev => ({ ...prev, ...res.data }));
                }
            } catch (error) {
                console.error('Error fetching restaurant details:', error);
            }
        };

        const fetchMenu = async () => {
            try {
                const res = await axios.get(`${getApiUrl()}/api/restaurants/${initialRestaurant._id}/menu`);
                setMenuSections(res.data);
                if (res.data.length > 0 && activeTab === 'Popular') {
                    setActiveTab(res.data[0].name);
                }
            } catch (error) {
                console.error('Error fetching menu:', error);
            }
        };

        const fetchReviews = async () => {
            try {
                const res = await axios.get(`${getApiUrl()}/api/restaurants/${initialRestaurant._id}/reviews`);
                setReviews(res.data);
                setReviewCount(res.data.length);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            }
        };

        const fetchVouchers = async () => {
            try {
                const res = await axios.get(`${getApiUrl()}/api/vouchers/restaurant/${initialRestaurant._id}`);
                setVouchers(res.data);
            } catch (error) {
                console.error('Error fetching vouchers:', error);
            }
        };

        const fetchDeals = async () => {
            try {
                const res = await axios.get(`${getApiUrl()}/api/deals/restaurant/${initialRestaurant._id}`);
                setDeals(res.data);
            } catch (error) {
                console.error('Error fetching deals:', error);
            }
        };

        const fetchAllData = () => {
            fetchRestaurantDetails();
            fetchMenu();
            fetchReviews();
            fetchVouchers();
            fetchDeals();
        };

        // Initial fetch
        fetchAllData();

        // Socket listener for real-time updates
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        // Initialize socket and subscribe to restaurant channel
         const socket = initSocket(userInfo._id, 'user');
         subscribeToChannel(`restaurant-${initialRestaurant._id}`);
 
         if (socket) {
            socket.on('menu_updated', (data: any) => {
                console.log('Menu updated via Pusher:', data);
                fetchMenu();
            });

            socket.on('restaurant_updated', (data: any) => {
                console.log('Restaurant updated via Pusher:', data);
                fetchRestaurantDetails();
            });

            socket.on('new_voucher', (data: any) => {
                console.log('New voucher via Pusher:', data);
                fetchVouchers();
            });
        }

        // Real-time polling every 30 seconds as a fallback (less frequent now)
        const interval = setInterval(fetchAllData, 30000);

        window.history.pushState({ modal: 'restaurant' }, '', '');
        const handlePopState = () => onBack();
        window.addEventListener('popstate', handlePopState);

        return () => {
            clearInterval(interval);
            window.removeEventListener('popstate', handlePopState);
            unsubscribeFromChannel(`restaurant-${initialRestaurant._id}`);
        };
    }, [initialRestaurant, onBack]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (!userInfo.token) {
                alert('Please login to submit a review');
                return;
            }

            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            await axios.post(`${getApiUrl()}/api/reviews`, {
                restaurantId: restaurantData._id,
                rating: newReview.rating,
                comment: newReview.comment
            }, config);

            // Refresh reviews
            const res = await axios.get(`${getApiUrl()}/api/restaurants/${restaurantData._id}/reviews`);
            setReviews(res.data);
            setReviewCount(res.data.length);
            setShowReviewModal(false);
            setNewReview({ rating: 5, comment: '' });
            alert('Review submitted successfully!');
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto"
        >
            {/* Header - Dark Theme */}
            <div className="bg-[#1a1a1a] p-4 flex items-center justify-between z-30 shadow-md">
                <button onClick={onBack} className="p-2 text-white hover:bg-white/10 rounded-full transition">
                    <FaBars size={20} />
                </button>
                <div className="flex-1 mx-4 relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Search restaurants or dishes"
                        className="w-full bg-[#2a2a2a] text-white text-sm rounded-full py-2 pl-9 pr-4 outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <button onClick={() => { const event = new CustomEvent('openCart'); window.dispatchEvent(event); }} className="relative p-2 text-white hover:bg-white/10 rounded-full transition cursor-pointer">
                    <FaShoppingCart size={20} />
                    {cartCount > 0 && (
                        <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                            {cartCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Banner Section */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-gray-900">
                <img
                    src={getImageUrl(restaurantData.coverImage || restaurantData.logo)}
                    alt="Restaurant Banner"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1470&auto=format&fit=crop';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Back Button Overlay */}
                <button 
                    onClick={onBack}
                    className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 shadow-lg z-20"
                >
                    <FaTimes />
                </button>

                {/* Restaurant Basic Info Overlay */}
                <div className="absolute bottom-12 left-8 right-8 z-10">
                    <div className="flex items-end gap-5">
                        <div className="relative flex-shrink-0">
                            <img
                                src={getImageUrl(restaurantData.logo)}
                                alt={restaurantData.name}
                                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-2xl bg-white"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = getImageFallback('logo');
                                }}
                            />
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${
                                restaurantData.storeStatus === 'open' ? 'bg-green-500' : 
                                restaurantData.storeStatus === 'busy' ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gray-400'
                            }`} />
                        </div>
                        <div className="flex-1 pb-1">
                            <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-md">{restaurantData.name}</h1>
                <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10">
                                    <FaStar className="text-yellow-400" size={14} />
                                    <span className="text-white font-medium text-sm">
                                        {reviews.length > 0
                                            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                                            : (restaurantData.rating > 0 ? restaurantData.rating.toFixed(1) : 'New')}
                                    </span>
                                </div>
                                <div className="text-white/90 text-sm font-normal drop-shadow-sm bg-black/20 backdrop-blur-sm px-3 py-1 rounded-xl">
                                    {restaurantData.cuisineTypes && restaurantData.cuisineTypes.length > 0
                                        ? restaurantData.cuisineTypes.join(', ')
                                        : (restaurantData.cuisine || 'Pakistani')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="bg-white px-4 sm:px-8 py-5 flex items-center justify-between border-b border-gray-100 shadow-sm relative z-20">
                <div className="flex items-center gap-4 sm:gap-12 max-w-[70%] overflow-hidden">
                    <div className="flex flex-col min-w-fit">
                        <span className="text-gray-400 text-[11px] font-normal mb-1 truncate">Distance</span>
                        <div className="flex items-center gap-1.5 text-gray-700 font-normal">
                            <FaMapMarkerAlt className="text-primary shrink-0 opacity-70" size={14} />
                            <span className="text-xs sm:text-sm truncate">{distance}</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-100 shrink-0" />
                    <div className="flex flex-col min-w-fit">
                        <span className="text-gray-400 text-[11px] font-normal mb-1 truncate">Delivery</span>
                        <div className="flex items-center gap-1.5 text-gray-700 font-normal">
                            <FaClock className="text-primary shrink-0 opacity-70" size={14} />
                            <span className="text-xs sm:text-sm truncate">{restaurantData.deliveryTime || '20-30 min'}</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        setActiveMainTab('menu');
                        setActiveTab('reviews');
                    }}
                    className="flex flex-col items-end group shrink-0"
                >
                    <span className="text-gray-400 text-[11px] font-normal mb-1">Reviews</span>
                    <span className="text-primary font-normal text-xs sm:text-sm group-hover:underline">{reviewCount} reviews</span>
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-white min-h-screen overflow-y-auto">
                {/* Main Tabs */}
                <div className="flex px-8 pt-4 border-b border-gray-100 bg-white z-20">
                    <button
                        onClick={() => setActiveMainTab('videos')}
                        className={`pb-3 pr-8 text-sm font-medium transition-all relative ${activeMainTab === 'videos' ? 'text-gray-900' : 'text-gray-400'}`}
                    >
                        Dish Videos
                        {activeMainTab === 'videos' && (
                            <motion.div layoutId="mainTabIndicator" className="absolute bottom-0 left-0 right-8 h-0.5 bg-primary" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveMainTab('menu')}
                        className={`pb-3 px-8 text-sm font-medium transition-all relative ${activeMainTab === 'menu' ? 'text-gray-900' : 'text-gray-400'}`}
                    >
                        Menu
                        {activeMainTab === 'menu' && (
                            <motion.div layoutId="mainTabIndicator" className="absolute bottom-0 left-8 right-8 h-0.5 bg-primary" />
                        )}
                    </button>
                </div>

            {/* Dish Videos Tab Content */}
            {activeMainTab === 'videos' && (
                <div className="bg-white px-4 pb-24">
                    <div className="grid grid-cols-2 gap-3 py-4">
                        {(() => {
                            const uniqueDishes = Array.from(new Set(menuSections.flatMap(s => s.items).filter(dish => dish.videoUrl).map(d => d._id)))
                                .map(id => menuSections.flatMap(s => s.items).find(d => d._id === id))
                                .filter(Boolean);
                            
                            return uniqueDishes.length > 0 ? (
                                uniqueDishes.map((dish: any) => (
                                    <div
                                        key={dish._id}
                                        onClick={() => setSelectedDish(dish)}
                                        className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group shadow-lg bg-gray-100"
                                    >
                                        <img
                                            src={getImageUrl(dish.imageUrl)}
                                            alt={dish.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = getImageFallback('dish');
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                                    
                                        {/* Play Icon Overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 duration-300">
                                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-xl">
                                                <FaPlay className="text-white ml-1 text-sm" />
                                            </div>
                                        </div>

                                        {/* Comment count overlay */}
                                        <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-white flex items-center gap-1.5 text-[10px] font-bold border border-white/10">
                                            <FaComment size={10} className="text-primary" />
                                            <span>{reviews.filter(r => r.dish?._id === dish._id).length}</span>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <p className="text-white font-bold text-xs line-clamp-1 mb-1">{dish.name}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-primary font-bold text-xs">Rs. {dish.price}</span>
                                                <div className="flex items-center gap-1">
                                                    <FaStar className="text-yellow-400" size={10} />
                                                    <span className="text-white text-[10px] font-bold">
                                                        {reviews.filter(r => r.dish?._id === dish._id).length > 0
                                                            ? (reviews.filter(r => r.dish?._id === dish._id).reduce((acc, r) => acc + r.rating, 0) / reviews.filter(r => r.dish?._id === dish._id).length).toFixed(1)
                                                            : '5.0'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <FaPlay className="mx-auto text-gray-300 text-4xl mb-3" />
                                    <p className="text-gray-500 font-medium">No dish videos available</p>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}

            {/* Menu Content */}
            {activeMainTab === 'menu' && (
                <div className="bg-white">
                    <div className="bg-white px-6 pb-2">

                        {/* Vouchers & Deals Section */}
                        {(vouchers.length > 0 || deals.length > 0) && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                                        {vouchers.filter(v => {
                                            const expiry = new Date(v.expiryDate);
                                            const now = new Date();
                                            expiry.setHours(23, 59, 59, 999);
                                            return v.isActive && expiry >= now;
                                        }).map((voucher) => (
                                            <div
                                                key={voucher._id}
                                                onClick={() => handleCopyCode(voucher.code, voucher._id)}
                                                className="min-w-[280px] w-[85vw] max-w-[320px] bg-gradient-to-br from-[#FFF0F5] to-[#FFF5F7] border border-[#FF4D8D] border-dashed rounded-xl p-4 flex-shrink-0 relative overflow-hidden cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-[#FF4D8D] rounded-lg flex items-center justify-center text-white text-xl shrink-0 shadow-sm">
                                                        <FaTicketAlt />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-baseline gap-2 mb-1">
                                                            <span className="text-2xl font-bold text-[#FF4D8D] leading-none">
                                                                {voucher.discount}%
                                                            </span>
                                                            <span className="text-sm font-bold text-[#FF4D8D] uppercase">OFF</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-sm font-bold text-gray-900 tracking-wide bg-white px-2 py-0.5 rounded border border-gray-100 inline-block shadow-sm">
                                                                {voucher.code}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-3 border-t border-dashed border-[#FF4D8D]/30 flex justify-between items-end">
                                                    <div className="text-[10px] text-gray-500 font-medium leading-tight max-w-[70%]">
                                                        Min. order Rs. {voucher.minimumAmount.toLocaleString()}<br />
                                                        Valid until {new Date(voucher.expiryDate).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-[#FF4D8D] flex items-center gap-1 bg-[#FF4D8D]/10 px-2 py-1 rounded-full">
                                                        {copiedVoucherId === voucher._id ? 'Copied! ✅' : 'Tap to Copy'}
                                                    </div>
                                                </div>

                                                {/* Ticket Cutouts */}
                                                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-r border-[#FF4D8D]" />
                                                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-l border-[#FF4D8D]" />
                                            </div>
                                        ))}
                                    </div>
                                </div>


                                {deals.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                            🏷️ Active Deals
                                        </h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            {deals.map((deal) => (
                                                <div
                                                    key={deal._id}
                                                    className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-3 flex justify-between items-center"
                                                >
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-sm mb-1">
                                                            {deal.title}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            {deal.description}
                                                        </div>
                                                    </div>
                                                    <div className="text-xl font-bold text-purple-600">
                                                        {deal.discountType === 'percentage' ? `${deal.discount}%` : `Rs. ${deal.discount.toLocaleString()}`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Category Navigation */}
                        <div className="z-10 bg-white shadow-sm border-b border-gray-100">
                            <div className="flex overflow-x-auto no-scrollbar">
                                {menuSections.map((section) => (
                                    <button
                                        key={section.name}
                                        onClick={() => {
                                            setActiveTab(section.name);
                                            document.getElementById(`section-${section.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className={`whitespace-nowrap px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === section.name
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {section.name}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setActiveTab('reviews')}
                                    className={`whitespace-nowrap px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'reviews'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Reviews
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* Content Area */}
                    <div className="bg-gray-50 p-4 pb-24">
                        {activeTab === 'reviews' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900">Customer Reviews ({reviewCount})</h3>
                                    <button
                                        onClick={() => setShowReviewModal(true)}
                                        className="text-primary text-sm font-bold hover:underline"
                                    >
                                        Write a Review
                                    </button>
                                </div>
                                {reviews.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                        <FaComment className="mx-auto text-gray-300 text-4xl mb-3" />
                                        <p className="text-gray-500 text-lg">No reviews yet</p>
                                        <p className="text-gray-400 text-sm mt-1">Be the first to review this restaurant!</p>
                                    </div>
                                ) : (
                                    reviews.map((review, index) => (
                                        <motion.div
                                            key={review._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                    {review.user?.name?.[0] || <FaUser />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-bold text-gray-900 text-sm">{review.user?.name || 'Anonymous'}</h4>
                                                        <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex text-yellow-400 text-xs mb-2">
                                                        {[...Array(5)].map((_, i) => (
                                                            <FaStar key={i} className={i < review.rating ? "text-yellow-400" : "text-gray-300"} />
                                                        ))}
                                                    </div>
                                                    {review.dish && (
                                                        <div className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded-lg w-fit">
                                                            {review.dish.imageUrl && (
                                                                <img src={getImageUrl(review.dish.imageUrl)} alt={review.dish.name} className="w-6 h-6 rounded object-cover" />
                                                            )}
                                                            <span className="text-xs font-medium text-gray-600">Reviewed: {review.dish.name}</span>
                                                        </div>
                                                    )}
                                                    <div className="relative pl-4">
                                                        <FaQuoteLeft className="absolute left-0 top-0 text-gray-300 text-xs" />
                                                        <p className="text-gray-600 text-sm italic">{review.comment}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8 pb-20">
                                {menuSections.map((section) => (
                                    <div key={section.name} id={`section-${section.name}`} className="scroll-mt-32">
                                        <h3 className="text-lg font-bold text-gray-900 mb-3">
                                            {section.name}
                                        </h3>
                                        <div className="space-y-4">
                                            {section.items.map((dish) => (
                                                <motion.div
                                                    key={dish._id}
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    onClick={() => setSelectedDish(dish)}
                                                    className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
                                                >
                                                    <div className="relative">
                                                        <img
                                                            src={getImageUrl(dish.imageUrl)}
                                                            alt={dish.name}
                                                            className="w-24 h-24 rounded-lg object-cover bg-gray-100"
                                                        />
                                                        {(dish.discount || 0) > 0 && (
                                                            <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-tl-lg rounded-br-lg">
                                                                {dish.discount}% OFF
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-between py-1">
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 mb-1">{dish.name}</h3>
                                                            <p className="text-gray-500 text-xs line-clamp-2 mb-2">{dish.description}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-primary font-bold">Rs. {dish.price.toLocaleString()}</span>
                                                                {(dish.discount || 0) > 0 && (
                                                                    <span className="text-gray-400 text-xs line-through">Rs. {Math.round(dish.price / (1 - (dish.discount || 0) / 100)).toLocaleString()}</span>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToCart({ 
                                                                        ...dish, 
                                                                        quantity: 1, 
                                                                        restaurantId: restaurantData._id, 
                                                                        restaurantName: restaurantData.name,
                                                                        imageUrl: dish.imageUrl 
                                                                    });
                                                                }}
                                                                className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
            }


            </div>


            <AnimatePresence>
                {
                    selectedDish && (
                        <DishDetails
                            dish={selectedDish}
                            onClose={() => setSelectedDish(null)}
                        />
                    )
                }
            </AnimatePresence >


            {/* Review Modal */}
            <AnimatePresence>
                {
                    showReviewModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
                            onClick={() => setShowReviewModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">Write a Review</h3>
                                    <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                                        <FaTimes size={20} />
                                    </button>
                                </div>
                                <form onSubmit={handleReviewSubmit}>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setNewReview({ ...newReview, rating: star })}
                                                    className={`text-2xl transition ${star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                                >
                                                    <FaStar />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                                        <textarea
                                            value={newReview.comment}
                                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary outline-none resize-none h-32"
                                            placeholder="Share your experience..."
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingReview}
                                        className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition disabled:opacity-50"
                                    >
                                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </form>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </motion.div >
    );
}

