'use client';
import { useState } from 'react';
import {
    FaChartLine,
    FaStore,
    FaShoppingBag,
    FaMotorcycle,
    FaMoneyBillWave,
    FaCog,
    FaSignOutAlt,
    FaCheckCircle,
    FaUser,
    FaTicketAlt,
    FaHeadset,
    FaChevronDown,
    FaChevronRight,
    FaMapMarkedAlt
} from 'react-icons/fa';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, onLogout }: SidebarProps) {
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['restaurants', 'riders', 'orders']);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: FaChartLine },
        {
            id: 'restaurants',
            label: 'Restaurants',
            icon: FaStore,
            subItems: [
                { id: 'restaurants-all', label: 'All Restaurants' },
                { id: 'restaurants-pending', label: 'Approvals' }
            ]
        },
        {
            id: 'orders',
            label: 'Orders',
            icon: FaShoppingBag,
            subItems: [
                { id: 'orders-live', label: 'Live Orders' },
                { id: 'orders-all', label: 'Order History' }
            ]
        },
        {
            id: 'riders',
            label: 'Riders',
            icon: FaMotorcycle,
            subItems: [
                { id: 'riders-all', label: 'All Riders' },
                { id: 'riders-pending', label: 'Rider Approvals' },
                { id: 'riders-map', label: 'Live Map' }
            ]
        },
        { id: 'customers', label: 'Customers', icon: FaUser },
        { id: 'finance', label: 'Finance', icon: FaMoneyBillWave },
        { id: 'vouchers', label: 'Vouchers', icon: FaTicketAlt },
        { id: 'admin-management', label: 'Admins', icon: FaUser },
        { id: 'support', label: 'Support', icon: FaHeadset },
        { id: 'settings', label: 'Settings', icon: FaCog },
    ];

    const toggleMenu = (menuId: string) => {
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    return (
        <>
            {/* Mobile Hamburger */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="md:hidden fixed top-4 right-4 z-[60] bg-white p-2 rounded-lg shadow-lg text-gray-700"
            >
                {isMobileOpen ? 'âœ•' : 'â˜°'}
            </button>

            {/* Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={`w-56 bg-white min-h-screen fixed left-0 top-0 flex flex-col border-r border-gray-100 z-50 font-sans transition-transform duration-300 transform
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                {/* Logo Section */}
                <div className="p-4 border-b border-gray-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                            <FaShoppingBag className="text-lg" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-gray-800 tracking-tight leading-none uppercase">FoodSwipe</h1>
                            <p className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5 uppercase">Admin Panel</p>
                        </div>
                    </div>
                </div>

                {/* Menu Section */}
                <div className="flex-1 overflow-y-auto py-3 px-3 custom-scrollbar">
                    <nav className="space-y-0.5">
                        {menuItems.map((item) => (
                            <div key={item.id} className="space-y-0.5">
                                <button
                                    onClick={() => item.subItems ? toggleMenu(item.id) : setActiveTab(item.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group
                                        ${(activeTab === item.id || (item.subItems?.some(s => s.id === activeTab)))
                                            ? 'bg-orange-50 text-orange-600 font-bold'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <item.icon className={`text-base ${activeTab === item.id || item.subItems?.some(s => s.id === activeTab) ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                        <span className="text-xs uppercase tracking-wider font-bold">{item.label}</span>
                                    </div>
                                    {item.subItems && (
                                        expandedMenus.includes(item.id) ? <FaChevronDown className="text-[10px]" /> : <FaChevronRight className="text-[10px]" />
                                    )}
                                </button>

                                {item.subItems && expandedMenus.includes(item.id) && (
                                    <div className="ml-8 space-y-0.5 mt-0.5">
                                        {item.subItems.map(sub => (
                                            <button
                                                key={sub.id}
                                                onClick={() => setActiveTab(sub.id)}
                                                className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all
                                                    ${activeTab === sub.id
                                                        ? 'text-orange-600 bg-orange-50/50'
                                                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {sub.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Footer Section */}
                <div className="p-3 border-t border-gray-50 bg-gray-50/30">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all group font-bold text-[10px] uppercase tracking-widest"
                    >
                        <FaSignOutAlt className="text-base group-hover:-translate-x-0.5 transition-transform" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </>
    );
}
