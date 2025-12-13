import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaBars, FaSearch, FaShoppingCart, FaStar, FaMapMarkerAlt, FaClock, FaPlay, FaTicketAlt, FaComment, FaUser, FaQuoteLeft, FaTimes } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useSwipeBack } from '../hooks/useSwipeBack';
import DishDetails from './DishDetails';
import { getImageUrl } from '../utils/imageUtils';

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
    rating: number;
    address: string;
    contact: string;
    cuisine?: string;
    cuisineTypes?: string[];
    deliveryTime?: string;
    distance?: string;
    reviewCount?: number;
    location?: {
        type: string;
        coordinates: number[];
    };
}

interface RestaurantProfileProps {
    restaurant: Restaurant;
    onBack: () => void;
}

export default function RestaurantProfile({ restaurant: initialRestaurant, onBack }: RestaurantProfileProps) {
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
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance >= 1000) {
            return (distance / 1000).toFixed(1) + 'k';
        }
        return distance.toFixed(1);
    };

    // Get user's location and calculate distance
    useEffect(() => {
        if (navigator.geolocation && restaurantData?.location?.coordinates) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLon = position.coords.longitude;
                    const [restLon, restLat] = restaurantData.location!.coordinates;
                    const dist = calculateDistance(userLat, userLon, restLat, restLon);
                    setDistance(`${dist} km`);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setDistance('Distance unavailable');
                }
            );
        } else {
            setDistance('2.3 km'); // Fallback
        }
    }, [restaurantData]);

    useEffect(() => {
        const fetchRestaurantDetails = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/restaurants/${initialRestaurant._id}`);
                if (res.data) {
                    setRestaurantData(prev => ({ ...prev, ...res.data }));
                }
            } catch (error) {
                console.error('Error fetching restaurant details:', error);
            }
        };

        const fetchMenu = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/restaurants/${initialRestaurant._id}/menu`);
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
                const res = await axios.get(`http://localhost:5000/api/restaurants/${initialRestaurant._id}/reviews`);
                setReviews(res.data);
                setReviewCount(res.data.length);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            }
        };

        const fetchVouchers = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/vouchers/restaurant/${initialRestaurant._id}`);
                setVouchers(res.data);
            } catch (error) {
                console.error('Error fetching vouchers:', error);
            }
        };

        const fetchDeals = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/deals/restaurant/${initialRestaurant._id}`);
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

        // Real-time polling every 5 seconds for live updates
        const interval = setInterval(fetchAllData, 5000);

        window.history.pushState({ modal: 'restaurant' }, '', '');
        const handlePopState = () => onBack();
        window.addEventListener('popstate', handlePopState);

        return () => {
            clearInterval(interval);
            window.removeEventListener('popstate', handlePopState);
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
            await axios.post('http://localhost:5000/api/reviews', {
                restaurantId: restaurantData._id,
                rating: newReview.rating,
                comment: newReview.comment
            }, config);

            // Refresh reviews
            const res = await axios.get(`http://localhost:5000/api/restaurants/${restaurantData._id}/reviews`);
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
            className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto flex flex-col"
        >
            {/* Header - Dark Theme */}
            <div className="bg-[#1a1a1a] p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
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

            {/* Restaurant Info Section */}

            <div className="bg-white p-6 pb-2">
                <div className="flex items-start gap-4 mb-4">
                    <img
                        src={getImageUrl(restaurantData.logo) || '/placeholder-logo.png'}
                        alt={restaurantData.name}
                        className="w-20 h-20 rounded-2xl object-cover shadow-md"
                    />
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-900 mb-1">{restaurantData.name}</h1>
                        <p className="text-gray-500 text-sm mb-2">
                            {restaurantData.cuisineTypes && restaurantData.cuisineTypes.length > 0
                                ? restaurantData.cuisineTypes.join(', ')
                                : (restaurantData.cuisine || 'Pakistani')}
                        </p>
                        <div className="flex items-center gap-1">
                            <FaStar className="text-yellow-400" size={14} />
                            <span className="text-gray-900 font-bold text-sm">
                                {reviews.length > 0
                                    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                                    : (restaurantData.rating > 0 ? restaurantData.rating.toFixed(1) : 'New')}
                            </span>
                            <span className="text-gray-400 text-sm mx-1">•</span>
                            <button
                                onClick={() => setActiveTab('reviews')}
                                className="text-gray-500 text-sm hover:text-primary transition underline underline-offset-2"
                            >
                                {reviewCount} reviews
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                        <FaMapMarkerAlt size={14} />
                        <span>{distance}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FaClock size={14} />
                        <span>{restaurantData.deliveryTime || '20-30 min'}</span>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex border-b border-gray-100 mb-4">
                    <button
                        onClick={() => setActiveMainTab('videos')}
                        className={`flex-1 pb-3 text-sm font-medium transition-all relative ${activeMainTab === 'videos' ? 'text-gray-900' : 'text-gray-500'}`}
                    >
                        Dish Videos
                        {activeMainTab === 'videos' && (
                            <motion.div layoutId="mainTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveMainTab('menu')}
                        className={`flex-1 pb-3 text-sm font-medium transition-all relative ${activeMainTab === 'menu' ? 'text-gray-900' : 'text-gray-500'}`}
                    >
                        Menu
                        {activeMainTab === 'menu' && (
                            <motion.div layoutId="mainTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                        )}
                    </button>
                </div>
            </div>

            {/* Dish Videos Content */}
            {activeMainTab === 'videos' && (
                <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 pb-20">
                        {Array.from(new Map(menuSections.flatMap(s => s.items).filter(d => d.videoUrl).map(item => [item._id, item])).values()).length > 0 ? (
                            Array.from(new Map(menuSections.flatMap(s => s.items).filter(d => d.videoUrl).map(item => [item._id, item])).values()).map((dish) => (
                                <div key={dish._id} className="relative rounded-xl overflow-hidden aspect-[3/4] group cursor-pointer" onClick={() => setSelectedDish(dish)}>
                                    <video
                                        src={getImageUrl(dish.videoUrl)}
                                        className="w-full h-full object-cover"
                                        muted
                                        loop
                                        playsInline
                                        onMouseOver={e => e.currentTarget.play()}
                                        onMouseOut={e => {
                                            e.currentTarget.pause();
                                            e.currentTarget.currentTime = 0;
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                                        <div className="flex items-center gap-1 text-xs mb-1 opacity-90">
                                            <FaPlay size={10} />
                                            <span>Preview</span>
                                        </div>
                                        <h3 className="font-bold text-sm leading-tight mb-1">{dish.name}</h3>
                                        <div className="flex justify-between items-end">
                                            <span className="font-bold text-sm text-yellow-400">Rs. {dish.price}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart({ ...dish, quantity: 1, restaurantId: restaurantData._id, restaurantName: restaurantData.name });
                                                }}
                                                className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full hover:bg-gray-200 transition"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 text-center py-12 text-gray-500 text-sm">
                                No dish videos available
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Menu Content */}
            {activeMainTab === 'menu' && (
                <>
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
                                                            <span className="text-2xl font-black text-[#FF4D8D] leading-none">
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
                                                        Min. order Rs. {voucher.minimumAmount}<br />
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
                                                        {deal.discountType === 'percentage' ? `${deal.discount}%` : `Rs. ${deal.discount}`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sticky Category Navigation */}
                        <div className="sticky top-[72px] z-10 bg-white shadow-sm border-b border-gray-100">
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
                    <div className="flex-1 bg-gray-50 p-4 overflow-y-auto no-scrollbar" onScroll={(e) => {
                        // Optional: Update active tab on scroll
                    }}>
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
                                                                <span className="text-primary font-bold">Rs. {dish.price}</span>
                                                                {(dish.discount || 0) > 0 && (
                                                                    <span className="text-gray-400 text-xs line-through">Rs. {Math.round(dish.price / (1 - (dish.discount || 0) / 100))}</span>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToCart({ ...dish, quantity: 1, restaurantId: restaurantData._id, restaurantName: restaurantData.name });
                                                                }}
                                                                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-primary-dark transition"
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
                </>
            )
            }


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
