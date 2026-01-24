import React, { useState, useEffect, useRef } from 'react';
import { FaHeart, FaComment, FaShare, FaPlay, FaVolumeUp, FaVolumeMute, FaChevronRight, FaTimes, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { getImageUrl, getImageFallback } from '../utils/imageUtils';
import { getApiUrl } from '../utils/config';
import toast from 'react-hot-toast';

export interface Dish {
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

interface VideoCardProps {
    dish: Dish;
    isActive: boolean;
    onOpenDetails: (dish: Dish) => void;
    onOpenProfile: (restaurant: any) => void;
    distance?: string;
    isNext?: boolean;
    user: any;
}

const VideoCard = React.memo(({
    dish,
    isActive,
    onOpenDetails,
    onOpenProfile,
    distance,
    isNext,
    user
}: VideoCardProps) => {
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
            const res = await axios.get(`${getApiUrl()}/api/videos/${dish._id}/comments`);
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

            const res = await axios.post(`${getApiUrl()}/api/videos/${dish._id}/like`, {}, {
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

        // Track share in backend (non-blocking)
        axios.post(`${getApiUrl()}/api/videos/${dish._id}/share`).catch(err => console.error('Share tracking failed:', err));
        setSharesCount(prev => prev + 1);

        const shareUrl = `${window.location.origin}/?dishId=${dish._id}`;
        const shareTitle = `Check out ${dish.name} on FoodSwipe!`;
        const shareText = `Look at this delicious ${dish.name} from ${dish.restaurant.name}. Order now!`;

        try {
            if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl
                });
            } else {
                // Fallback to clipboard for desktop or if share API fails
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied to clipboard!', {
                    icon: '🔗',
                    duration: 3000,
                    style: {
                        borderRadius: '12px',
                        background: '#1A1A1A',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '14px',
                        fontWeight: '600'
                    },
                });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                // Last resort fallback if share API was present but failed
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success('Link copied to clipboard!');
                } catch (clipboardErr) {
                    toast.error('Could not share. Please copy the URL manually.');
                }
            }
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        try {
            if (!user?.token) return alert('Please login to comment');

            const res = await axios.post(`${getApiUrl()}/api/videos/${dish._id}/comment`, {
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
        <div className="relative h-[100dvh] w-full snap-start snap-always bg-black flex-shrink-0 overflow-hidden" onClick={togglePlay}>
            <div className="absolute inset-0 z-0" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
                {dish.videoUrl ? (
                    <div className="relative w-full h-full">
                        <video
                            ref={videoRef}
                            src={getImageUrl(dish.videoUrl)}
                            className="w-full h-full object-cover"
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

export default VideoCard;
