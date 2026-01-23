'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaTimes,
    FaUser,
    FaUtensils,
    FaMotorcycle,
    FaCog,
    FaSignOutAlt,
    FaHistory,
    FaShieldAlt,
    FaChevronRight,
    FaTicketAlt,
    FaHeadphones,
    FaCommentDots,
    FaMapMarkerAlt
} from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MyProfile from './MyProfile';
import MyOrders from './MyOrders';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { getApiUrl } from '../utils/config';

const OrderTracking = dynamic(() => import('./OrderTracking'), { ssr: false });
import DiscountsVouchers from './DiscountsVouchers';
import ChatbotSupport from './ChatbotSupport';
import Settings from './Settings';
import Helpline from './Helpline';

interface NavDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onOpenProfile?: () => void;
    activeOrderId?: string;
}

export default function NavDrawer({ isOpen, onClose, user, onOpenProfile, activeOrderId }: NavDrawerProps) {
    const router = useRouter();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showOrdersModal, setShowOrdersModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [showVouchersModal, setShowVouchersModal] = useState(false);
    const [showChatbotModal, setShowChatbotModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showHelplineModal, setShowHelplineModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
    const [voucherCount, setVoucherCount] = useState(0);

    // Fetch voucher count on mount
    React.useEffect(() => {
        const fetchVoucherCount = async () => {
            try {
                const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('userInfo') || '{}').token;
                if (!token) return;

                // We'll fetch all vouchers and filter client-side for active ones to get the count
                // Or create a specific endpoint. For now reusing existing endpoint.
                const { data } = await axios.get(`${getApiUrl()}/api/vouchers`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Count active unseen vouchers? For now just count valid ones.
                const activeCount = data.filter((v: any) => !v.used).length;
                setVoucherCount(activeCount);
            } catch (error) {
                console.error('Error fetching voucher count:', error);
            }
        };

        if (isOpen) {
            fetchVoucherCount();
        }
    }, [isOpen]);

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        localStorage.removeItem('userLocation');
        onClose();
        window.location.href = '/';
    };

    interface MenuItem {
        icon: React.ElementType;
        label: string;
        href?: string;
        onClick?: () => void;
        badge: string | null;
        adminOnly?: boolean;
    }

    const menuItems: { section: string; items: MenuItem[] }[] = [
        {
            section: 'Menu',
            items: [
                {
                    icon: FaShieldAlt,
                    label: 'Admin Dashboard',
                    href: '/admin',
                    badge: null,
                    adminOnly: true
                },
                {
                    icon: FaUser,
                    label: 'My Profile',
                    onClick: () => {
                        setShowProfileModal(true);
                        onClose();
                    },
                    badge: null
                },
                {
                    icon: FaHistory,
                    label: 'My Orders',
                    onClick: () => {
                        setShowOrdersModal(true);
                        onClose();
                    },
                    badge: null  // Removed mock badge
                },
                {
                    icon: FaMapMarkerAlt,
                    label: 'Order Tracking',
                    onClick: () => {
                        if (activeOrderId) {
                            setSelectedOrderId(activeOrderId);
                            setShowTrackingModal(true);
                        } else {
                            setShowOrdersModal(true);
                        }
                        onClose();
                    },
                    badge: activeOrderId ? '1' : null
                },
                {
                    icon: FaTicketAlt,
                    label: 'Discounts & Vouchers',
                    onClick: () => {
                        setShowVouchersModal(true);
                        onClose();
                    },
                    badge: voucherCount > 0 ? voucherCount.toString() : null
                },
                {
                    icon: FaCommentDots,
                    label: 'Chatbot Support',
                    onClick: () => {
                        setShowChatbotModal(true);
                        onClose();
                    },
                    badge: null
                },
                {
                    icon: FaHeadphones,
                    label: 'Helpline',
                    onClick: () => {
                        setShowHelplineModal(true);
                        onClose();
                    },
                    badge: null
                },
                {
                    icon: FaCog,
                    label: 'Settings',
                    onClick: () => {
                        setShowSettingsModal(true);
                        onClose();
                    },
                    badge: null
                },
            ]
        }
    ];

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: isOpen ? 0 : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 w-80 sm:w-96 h-full bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
            >
                <div className="relative bg-gradient-to-br from-orange-500 to-pink-600 p-6 text-white overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full blur-2xl" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold tracking-wide">Menu</h2>
                            <button
                                onClick={onClose}
                                className="p-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors"
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm p-0.5 shadow-inner">
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden text-white text-lg font-medium border border-white/10">
                                    {user?.name ? user.name[0].toUpperCase() : <FaUser size={14} />}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-medium truncate">{user?.name || 'Guest User'}</h2>
                                <p className="text-xs text-white font-medium truncate">{user?.email || 'Sign in to order'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 py-2 overflow-y-auto bg-white no-scrollbar">
                    {menuItems.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-1">
                            {sectionIndex > 0 && (
                                <div className="px-6 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-widest mt-2">
                                    {section.section}
                                </div>
                            )}
                            {section.items.map((item, itemIndex) => {
                                const isAdmin = ['admin', 'super-admin', 'finance-admin', 'support-admin', 'restaurant-manager'].includes(user?.role);
                                if (item.adminOnly && !isAdmin) {
                                    return null;
                                }

                                const ItemContent = (
                                    <motion.div
                                        whileHover={{ x: 4 }}
                                        className="flex items-center gap-3 px-6 py-3 text-gray-700 hover:text-primary transition-colors cursor-pointer group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-orange-50 group-hover:text-primary transition-colors">
                                            <item.icon size={14} />
                                        </div>
                                        <span className="flex-1 text-sm font-semibold text-gray-700 group-hover:text-gray-900">{item.label}</span>
                                        {item.badge && (
                                            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                                {item.badge}
                                            </span>
                                        )}
                                        {!item.badge && (
                                            <FaChevronRight className="text-gray-500 group-hover:text-primary/50 transition-colors" size={10} />
                                        )}
                                    </motion.div>
                                );

                                if (item.onClick) {
                                    return (
                                        <div
                                            key={itemIndex}
                                            onClick={item.onClick}
                                            className="w-full text-left cursor-pointer"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    item.onClick?.();
                                                }
                                            }}
                                        >
                                            {ItemContent}
                                        </div>
                                    );
                                }

                                return (
                                    <Link key={itemIndex} href={item.href || '#'} onClick={onClose}>
                                        {ItemContent}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-50 bg-white">
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-100 rounded-lg text-sm font-medium transition-all"
                    >
                        <FaSignOutAlt size={14} />
                        <span>Log Out</span>
                    </motion.button>
                </div>
            </motion.div>

            <MyProfile
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                user={user || {
                    name: 'John Doe',
                    email: 'john.doe@email.com',
                    phone: '+92 329 5599855',
                    address: 'Gulberg III, Lahore, Pakistan',
                    memberSince: 'January 2024'
                }}
            />
            <MyOrders
                isOpen={showOrdersModal}
                onClose={() => setShowOrdersModal(false)}
                onTrackOrder={(orderId) => {
                    setSelectedOrderId(orderId);
                    setShowOrdersModal(false);
                    setShowTrackingModal(true);
                }}
            />
            <OrderTracking
                isOpen={showTrackingModal}
                onClose={() => setShowTrackingModal(false)}
                orderId={selectedOrderId}
            />
            <DiscountsVouchers
                isOpen={showVouchersModal}
                onClose={() => setShowVouchersModal(false)}
            />
            <ChatbotSupport
                isOpen={showChatbotModal}
                onClose={() => setShowChatbotModal(false)}
            />
            <Settings
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
            />
            <Helpline
                isOpen={showHelplineModal}
                onClose={() => setShowHelplineModal(false)}
            />
        </>
    );
}

