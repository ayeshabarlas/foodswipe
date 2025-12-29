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
                {isMobileOpen ? '✕' : '☰'}
            </button>

            {/* Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={`w-64 bg-white min-h-screen fixed left-0 top-0 flex flex-col border-r border-gray-200 z-50 font-sans transition-transform duration-300 transform
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                {/* Logo Section */}
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <FaShoppingBag className="text-xl" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800 leading-tight">FOODSWIPE</h1>
                            <p className="text-xs text-gray-500">Admin Dashboard</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                    {menuItems.map((item) => {
                        const isExpanded = expandedMenus.includes(item.id);
                        const isActive = activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab));

                        return (
                            <div key={item.id}>
                                {item.subItems ? (
                                    // Expandable Menu Item
                                    <div>
                                        <button
                                            onClick={() => toggleMenu(item.id)}
                                            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className={`text-lg ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                                                <span>{item.label}</span>
                                            </div>
                                            {isExpanded ? <FaChevronDown className="text-xs opacity-50" /> : <FaChevronRight className="text-xs opacity-50" />}
                                        </button>

                                        {isExpanded && (
                                            <div className="mt-1 ml-4 border-l-2 border-gray-100 pl-4 space-y-1">
                                                {item.subItems.map(subItem => (
                                                    <button
                                                        key={subItem.id}
                                                        onClick={() => {
                                                            setActiveTab(subItem.id);
                                                            setIsMobileOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === subItem.id
                                                            ? 'text-orange-600 font-medium bg-orange-50'
                                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {subItem.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Standard Menu Item
                                    <button
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setIsMobileOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${activeTab === item.id
                                            ? 'text-orange-600 font-medium bg-orange-50'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <item.icon className={`text-lg ${activeTab === item.id ? 'text-orange-500' : 'text-gray-400'}`} />
                                        <span>{item.label}</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Profile Footer */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                            SA
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-800 truncate">Super Admin</h4>
                            <p className="text-xs text-gray-500 truncate">admin@foodswipe.com</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                    >
                        <FaSignOutAlt />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}
