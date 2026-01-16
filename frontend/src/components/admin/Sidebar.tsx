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
                {isMobileOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
            </button>

            {/* Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={`w-64 bg-white text-[#111827] min-h-screen overflow-y-auto fixed left-0 top-0 flex flex-col border-r border-gray-100 z-50 font-sans transition-transform duration-300 transform
                  ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                {/* Logo Section */}
                <div className="p-6 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                            <FaShoppingBag className="text-xl" />
                        </div>
                        <div>
                            <h1 className="text-[18px] font-bold text-[#111827] tracking-tight leading-none uppercase">FoodSwipe</h1>
                            <p className="text-[11px] text-gradient-orange-red font-semibold tracking-wider mt-1 uppercase">Admin Panel</p>
                        </div>
                    </div>
                </div>

                {/* Menu Section */}
                <div className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
                    <nav className="space-y-1">
                        {menuItems.map((item) => (
                            <div key={item.id} className="space-y-1">
                                <button
                                    onClick={() => item.subItems ? toggleMenu(item.id) : setActiveTab(item.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group
                                        ${(activeTab === item.id || (item.subItems?.some(s => s.id === activeTab)))
                                            ? 'bg-gradient-to-r from-orange-500/10 to-pink-500/10 text-[#FF6A00] shadow-sm shadow-orange-500/5'
                                            : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                            (activeTab === item.id || (item.subItems?.some(s => s.id === activeTab)))
                                                ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/20 scale-110'
                                                : 'bg-gray-50 text-[#9CA3AF] group-hover:bg-gray-100 group-hover:text-[#6B7280]'
                                        }`}>
                                            <item.icon className="text-[18px]" />
                                        </div>
                                        <span className={`text-[14px] font-bold tracking-tight ${
                                            (activeTab === item.id || (item.subItems?.some(s => s.id === activeTab)))
                                                ? 'text-[#111827]'
                                                : 'text-[#6B7280]'
                                        }`}>{item.label}</span>
                                    </div>
                                    {item.subItems && (
                                        <div className={`transition-transform duration-300 ${expandedMenus.includes(item.id) ? 'rotate-180' : ''}`}>
                                            <FaChevronDown className={`text-[10px] ${
                                                (activeTab === item.id || (item.subItems?.some(s => s.id === activeTab)))
                                                    ? 'text-[#FF6A00]'
                                                    : 'opacity-40'
                                            }`} />
                                        </div>
                                    )}
                                </button>

                                {item.subItems && expandedMenus.includes(item.id) && (
                                    <div className="ml-12 space-y-1 mt-1 border-l-2 border-orange-100/50 pl-2">
                                        {item.subItems.map(sub => (
                                            <button
                                                key={sub.id}
                                                onClick={() => setActiveTab(sub.id)}
                                                className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200
                                                    ${activeTab === sub.id
                                                        ? 'text-[#FF6A00] bg-orange-50/50 shadow-sm shadow-orange-500/5'
                                                        : 'text-[#9CA3AF] hover:text-[#6B7280] hover:bg-gray-50'
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

                {/* Logout & Support Section */}
                <div className="p-4 border-t border-gray-50 space-y-2">
                    <div className="px-4 py-3 bg-gray-50 rounded-xl mb-2">
                        <p className="text-[11px] text-[#9CA3AF] font-semibold uppercase tracking-wider mb-1">Support</p>
                        <a 
                            href="mailto:app.foodswipehelp@gmail.com" 
                            className="text-[12px] font-medium text-[#6B7280] hover:text-[#FF6A00] transition-colors truncate block"
                        >
                            app.foodswipehelp@gmail.com
                        </a>
                    </div>
                    
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 group"
                    >
                        <FaSignOutAlt className="text-[18px]" />
                        <span className="text-[14px] font-semibold">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}
