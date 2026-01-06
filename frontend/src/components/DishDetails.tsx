"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaTimes, FaStar, FaMinus, FaPlus, FaShoppingCart, FaPlay, FaPause } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import axios from "axios";
import { API_BASE_URL } from "../utils/config";
import { useSwipeBack } from "../hooks/useSwipeBack";

import { getImageUrl } from "../utils/imageUtils";

interface Variant {
    name: string;
    price: number;
}

interface Dish {
    _id: string;
    name: string;
    description: string;
    price: number;
    videoUrl: string;
    imageUrl: string;
    ingredients?: string[];
    variants?: Variant[];
    restaurant: {
        _id: string;
        name: string;
        logo: string;
        rating?: number;
        address?: string;
        contact?: string;
    };
}

interface DishDetailsProps {
    dish: Dish;
    onClose: () => void;
}

export default function DishDetails({ dish, onClose }: DishDetailsProps) {
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'ingredients' | 'reviews'>('ingredients');
    const { addToCart } = useCart();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Variant state
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
        dish.variants && dish.variants.length > 0 ? dish.variants[0] : null
    );

    // Enable swipe back gesture
    useSwipeBack({ onSwipeBack: onClose });

    useEffect(() => {
        if (activeTab === 'reviews') {
            fetchReviews();
        }
    }, [activeTab]);

    const fetchReviews = async () => {
        setLoadingReviews(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/videos/${dish._id}/comments`);
            setReviews(res.data);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleAddToCart = () => {
        const finalPrice = selectedVariant ? selectedVariant.price : dish.price;
        const itemName = selectedVariant ? `${dish.name} (${selectedVariant.name})` : dish.name;

        addToCart({
            _id: dish._id,
            name: itemName,
            price: finalPrice,
            quantity: quantity,
            restaurantId: dish.restaurant._id,
            restaurantName: dish.restaurant.name
        });
        onClose();
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const currentPrice = selectedVariant ? selectedVariant.price : dish.price;

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] flex flex-col bg-white"
        >
            {/* Header Video Area */}
            <div className="relative h-[40vh] w-full shrink-0 bg-black" onClick={togglePlay}>
                <video
                    ref={videoRef}
                    src={getImageUrl(dish.videoUrl)}
                    className="h-full w-full object-cover"
                    loop
                    autoPlay
                    playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                            <FaPlay className="ml-1 text-2xl" />
                        </div>
                    </div>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition z-10"
                >
                    <FaTimes size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 pb-32">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{dish.name}</h1>
                    <p className="text-gray-500 font-medium mb-3">{dish.restaurant.name}</p>

                    <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-primary">Rs. {currentPrice}</span>
                        <div className="flex items-center gap-1">
                            <FaStar className="text-yellow-400" size={16} />
                            <span className="text-gray-900 font-bold">{dish.restaurant.rating || 'New'}</span>
                            <span className="text-gray-500 text-sm">({reviews.length})</span>
                        </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed text-sm">{dish.description}</p>
                </div>

                {/* Variants Selection */}
                {dish.variants && dish.variants.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Select Size</h3>
                        <div className="flex flex-wrap gap-3">
                            {dish.variants.map((variant, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${selectedVariant?.name === variant.name
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {variant.name} - Rs. {variant.price}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveTab('ingredients')}
                        className={`flex-1 py-3 text-center font-semibold text-sm transition-all relative ${activeTab === 'ingredients' ? 'text-gray-900' : 'text-gray-400'
                            }`}
                    >
                        Ingredients
                        {activeTab === 'ingredients' && (
                            <motion.div layoutId="dishTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`flex-1 py-3 text-center font-semibold text-sm transition-all relative ${activeTab === 'reviews' ? 'text-gray-900' : 'text-gray-400'
                            }`}
                    >
                        Reviews ({reviews.length})
                        {activeTab === 'reviews' && (
                            <motion.div layoutId="dishTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'ingredients' ? (
                    <div className="grid grid-cols-2 gap-y-3">
                        {dish.ingredients && dish.ingredients.length > 0 ? (
                            dish.ingredients.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    <span className="text-gray-600 text-sm capitalize">{item}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm col-span-2">No ingredients listed.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {loadingReviews ? (
                            <p className="text-center text-gray-500">Loading reviews...</p>
                        ) : reviews.length > 0 ? (
                            reviews.map((review, i) => (
                                <div key={i} className="border-b border-gray-100 pb-3 last:border-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm text-gray-900">{review.user?.name || 'User'}</span>
                                        <div className="flex text-yellow-400 text-xs">
                                            {[...Array(5)].map((_, idx) => (
                                                <FaStar key={idx} className={idx < (review.rating || 5) ? "text-yellow-400" : "text-gray-300"} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">"{review.comment}"</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 text-sm">No reviews yet.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="absolute bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 bg-gray-100 rounded-full px-4 py-2">
                    <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-gray-600 shadow-sm hover:text-primary transition"
                    >
                        <FaMinus size={12} />
                    </button>
                    <span className="font-bold text-gray-900 w-4 text-center">{quantity}</span>
                    <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-gray-600 shadow-sm hover:text-primary transition"
                    >
                        <FaPlus size={12} />
                    </button>
                </div>

                <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                    <FaShoppingCart />
                    Add to Cart • Rs. {(currentPrice * quantity).toLocaleString()}
                </button>
            </div>
        </motion.div>
    );
}

