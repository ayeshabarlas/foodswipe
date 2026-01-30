'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../hooks/useSettings';
import { FaTimes, FaLock, FaCreditCard, FaMapMarkerAlt, FaGlobe, FaChevronRight, FaFileContract, FaShieldAlt, FaInfoCircle, FaPlus, FaTrash, FaCheck } from 'react-icons/fa';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
    const { settings } = useSettings();
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [showAboutModal, setShowAboutModal] = useState<string | null>(null);
    const [showAccountModal, setShowAccountModal] = useState<string | null>(null);

    // Password form state
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

    // Payment methods state
    const [paymentMethods, setPaymentMethods] = useState<any[]>([
        { id: 1, type: 'card', last4: '4242', brand: 'Visa' }
    ]);
    const [newCard, setNewCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

    // Addresses state
    const [addresses, setAddresses] = useState<any[]>([
        { id: 1, label: 'Home', address: '123 Main Street, Lahore', isDefault: true }
    ]);
    const [newAddress, setNewAddress] = useState({ label: '', address: '', isDefault: false });

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) {
            alert('Passwords do not match!');
            return;
        }
        alert('Password changed successfully!');
        setPasswordForm({ current: '', new: '', confirm: '' });
        setShowAccountModal(null);
    };

    const handleAddPaymentMethod = (e: React.FormEvent) => {
        e.preventDefault();
        const newMethod = {
            id: Date.now(),
            type: 'card',
            last4: newCard.number.slice(-4),
            brand: 'Visa'
        };
        setPaymentMethods([...paymentMethods, newMethod]);
        setNewCard({ number: '', expiry: '', cvv: '', name: '' });
        alert('Payment method added!');
    };

    const handleAddAddress = (e: React.FormEvent) => {
        e.preventDefault();
        const newAddr = {
            id: Date.now(),
            ...newAddress
        };
        setAddresses([...addresses, newAddr]);
        setNewAddress({ label: '', address: '', isDefault: false });
        alert('Address added!');
    };

    const accountSettings = [
        {
            icon: FaLock,
            label: 'Change Password',
            onClick: () => setShowAccountModal('password')
        },
        {
            icon: FaCreditCard,
            label: 'Payment Methods',
            onClick: () => setShowAccountModal('payment')
        },
        {
            icon: FaMapMarkerAlt,
            label: 'Saved Addresses',
            onClick: () => setShowAccountModal('addresses')
        }
    ];

    const aboutContent: any = {
        terms: {
            title: 'Terms of Service',
            content: `Welcome to FoodSwipe! By using our service, you agree to these terms.

1. Business Information
   - Registered Name: FoodSwipe (Private) Limited
   - Business Address: Allama Iqbal Town, Lahore
   - Contact: +923295599855
   - Email: app.foodswipehelp@gmail.com

2. Service Usage
   - You must be 18 years or older to use FoodSwipe.
   - Provide accurate information during registration.
   - Keep your account credentials secure.
   - FoodSwipe reserves the right to suspend accounts for violations.

3. Orders & Payments
   - All orders are subject to restaurant availability.
   - Prices may vary and are confirmed at checkout.
   - Payment is processed securely through our platform.
   - Taxes and delivery fees are calculated based on location.

4. Delivery
   - Delivery times are estimates and may vary due to traffic or weather.
   - We are not responsible for delays beyond our control.
   - You must be available at the provided address to receive your order.

5. Refund & Cancellation Policy
   - Order Cancellation: Orders can only be cancelled before the restaurant accepts them.
   - Refunds: Refunds are processed within 5-7 business days for eligible cancelled orders.
   - Incorrect Orders: If you receive an incorrect or damaged item, please report it via the Support section within 2 hours.
   - Delivery Failure: If a delivery fails due to incorrect address or unavailability, no refund will be issued.

6. Customer Complaint Handling
   - We value your feedback and take complaints seriously.
   - Mechanism: You can lodge a complaint via the "Support" tab in the app or email us at app.foodswipehelp@gmail.com.
   - Resolution: Our team will acknowledge your complaint within 24 hours and aim for resolution within 48-72 hours.
   - Appeals: If unsatisfied with the resolution, you may escalate to app.foodswipehelp@gmail.com.

7. User Conduct
   - Use the service respectfully and lawfully.
   - Do not misuse or abuse the platform.
   - Provide honest reviews and ratings.

8. Jurisdiction & Governing Law
   - These Terms and Conditions shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan.
   - Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Lahore, Pakistan.

Last updated: January 2026`
        },
        privacy: {
            title: 'Privacy Policy',
            content: `At FoodSwipe, we value your privacy and are committed to protecting your personal information.

1. Information We Collect
   - Account details (name, email, phone number)
   - Delivery addresses and GPS location
   - Order history and preferences
   - Payment information (processed securely via third-party providers)

2. How We Use Your Information
   - Process and deliver your orders.
   - Improve our services and user experience.
   - Send order updates and promotional notifications.
   - Provide real-time customer support.

3. Information Sharing
   - We share necessary details with restaurants and delivery partners.
   - We never sell your personal information to third parties.
   - Third-party services are used only for payment processing and analytics.

4. Data Security
   - We use industry-standard SSL encryption.
   - Regular security audits and database backups.
   - Secure payment processing compliant with PCI-DSS.

5. Your Rights
   - Access and update your personal data.
   - Request data deletion via account settings.
   - Opt-out of marketing communications.
   - Right to be informed about data breaches.

For questions, contact us at app.foodswipehelp@gmail.com

Last updated: January 2026`
        },
        about: {
            title: 'About FoodSwipe',
            content: `FoodSwipe - Your Ultimate Food Delivery Experience

Version: 1.0.0

FoodSwipe is a modern food delivery platform that connects you with the best restaurants in your area. Our mission is to make food ordering simple, fast, and enjoyable.

🍔 What We Offer:
   • Wide selection of restaurants and cuisines
   • Real-time order tracking
   • Secure payment options
   • Fast and reliable delivery
   • Exclusive deals and discounts

🎯 Our Mission:
To revolutionize food delivery by providing a seamless experience that brings your favorite meals to your doorstep with just a few taps.

👥 Our Team:
We're a passionate team of food lovers and tech enthusiasts dedicated to making your dining experience exceptional.

📧 Contact Us:
   Email: app.foodswipehelp@gmail.com
   Phone: +923295599855
   Address: Allama Iqbal Town, Lahore

Follow us on social media:
   Instagram: @foodswipe
   Facebook: /foodswipe
   Twitter: @foodswipe

Thank you for choosing FoodSwipe! 🙏`
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 p-6 shadow-md z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-white text-2xl font-semibold">Settings</h2>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Settings Content */}
                        <div className="p-6 space-y-8">
                            {/* Account Section */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-1">Account</h3>
                                <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
                                    {accountSettings.map((item, index) => {
                                        const Icon = item.icon;
                                        return (
                                            <motion.button
                                                key={index}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={item.onClick}
                                                className={`w-full flex items-center gap-4 p-4 text-gray-800 hover:bg-white transition ${index !== accountSettings.length - 1 ? 'border-b border-gray-200' : ''
                                                    }`}
                                            >
                                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-orange-600">
                                                    <Icon size={20} />
                                                </div>
                                                <span className="flex-1 text-left font-medium">{item.label}</span>
                                                <FaChevronRight className="text-gray-400" size={16} />
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Language Section */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-1">Preferences</h3>
                                <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedLanguage(selectedLanguage === 'English' ? 'Urdu' : 'English')}
                                        className="w-full flex items-center gap-4 p-4 text-gray-800 hover:bg-white transition"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-orange-600">
                                            <FaGlobe size={20} />
                                        </div>
                                        <span className="flex-1 text-left font-medium">Language</span>
                                        <span className="text-sm text-gray-500 font-normal">{selectedLanguage}</span>
                                        <FaChevronRight className="text-gray-400" size={16} />
                                    </motion.button>
                                </div>
                            </div>

                            {/* About Section */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-1">About</h3>
                                <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowAboutModal('terms')}
                                        className="w-full flex items-center gap-4 p-4 text-gray-800 hover:bg-white transition border-b border-gray-200"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-orange-600">
                                            <FaFileContract size={20} />
                                        </div>
                                        <span className="flex-1 text-left font-medium">Terms of Service</span>
                                        <FaChevronRight className="text-gray-400" size={16} />
                                    </motion.button>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowAboutModal('privacy')}
                                        className="w-full flex items-center gap-4 p-4 text-gray-800 hover:bg-white transition border-b border-gray-200"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-orange-600">
                                            <FaShieldAlt size={20} />
                                        </div>
                                        <span className="flex-1 text-left font-medium">Privacy Policy</span>
                                        <FaChevronRight className="text-gray-400" size={16} />
                                    </motion.button>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowAboutModal('about')}
                                        className="w-full flex items-center gap-4 p-4 text-gray-800 hover:bg-white transition"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-orange-600">
                                            <FaInfoCircle size={20} />
                                        </div>
                                        <span className="flex-1 text-left font-medium">About FoodSwipe</span>
                                        <FaChevronRight className="text-gray-400" size={16} />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Version */}
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-400 font-normal">Version 1.0.0</p>
                                <p className="text-xs text-gray-400 mt-1 font-light">© 2024 FoodSwipe. All rights reserved.</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Account Modals */}
                    <AnimatePresence>
                        {showAccountModal && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/60 z-[60]"
                                    onClick={() => setShowAccountModal(null)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] bg-white rounded-3xl shadow-2xl z-[70] overflow-hidden flex flex-col"
                                >
                                    <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 flex items-center justify-between">
                                        <h3 className="text-white text-xl font-semibold">
                                            {showAccountModal === 'password' && 'Change Password'}
                                            {showAccountModal === 'payment' && 'Payment Methods'}
                                            {showAccountModal === 'addresses' && 'Saved Addresses'}
                                        </h3>
                                        <button
                                            onClick={() => setShowAccountModal(null)}
                                            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
                                        >
                                            <FaTimes size={16} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        {showAccountModal === 'password' && (
                                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.current}
                                                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.new}
                                                        onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.confirm}
                                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                                        required
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition"
                                                >
                                                    Change Password
                                                </button>
                                            </form>
                                        )}

                                        {showAccountModal === 'payment' && (
                                            <div className="space-y-6">
                                                {/* Existing Payment Methods */}
                                                <div className="space-y-3">
                                                    {paymentMethods.map((method) => (
                                                        <div key={method.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                            <div className="flex items-center gap-3">
                                                                <FaCreditCard className="text-orange-500" size={24} />
                                                                <div>
                                                                    <p className="font-medium text-gray-800">{method.brand} •••• {method.last4}</p>
                                                                    <p className="text-xs text-gray-500">Card</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => setPaymentMethods(paymentMethods.filter(p => p.id !== method.id))}
                                                                className="text-red-500 hover:text-red-600"
                                                            >
                                                                <FaTrash size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add New Card Form */}
                                                <form onSubmit={handleAddPaymentMethod} className="space-y-4 pt-4 border-t border-gray-200">
                                                    <h4 className="font-medium text-gray-800">Add New Card</h4>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                                                        <input
                                                            type="text"
                                                            value={newCard.number}
                                                            onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                                                            placeholder="1234 5678 9012 3456"
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label>
                                                            <input
                                                                type="text"
                                                                value={newCard.expiry}
                                                                onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                                                                placeholder="MM/YY"
                                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                                                            <input
                                                                type="text"
                                                                value={newCard.cvv}
                                                                onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                                                                placeholder="123"
                                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
                                                    >
                                                        <FaPlus size={14} />
                                                        Add Card
                                                    </button>
                                                </form>
                                            </div>
                                        )}

                                        {showAccountModal === 'addresses' && (
                                            <div className="space-y-6">
                                                {/* Existing Addresses */}
                                                <div className="space-y-3">
                                                    {addresses.map((addr) => (
                                                        <div key={addr.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <FaMapMarkerAlt className="text-orange-500" size={18} />
                                                                    <span className="font-medium text-gray-800">{addr.label}</span>
                                                                    {addr.isDefault && (
                                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Default</span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => setAddresses(addresses.filter(a => a.id !== addr.id))}
                                                                    className="text-red-500 hover:text-red-600"
                                                                >
                                                                    <FaTrash size={14} />
                                                                </button>
                                                            </div>
                                                            <p className="text-sm text-gray-600 ml-6">{addr.address}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add New Address Form */}
                                                <form onSubmit={handleAddAddress} className="space-y-4 pt-4 border-t border-gray-200">
                                                    <h4 className="font-medium text-gray-800">Add New Address</h4>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                                                        <input
                                                            type="text"
                                                            value={newAddress.label}
                                                            onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                                                            placeholder="Home, Office, etc."
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                                        <textarea
                                                            value={newAddress.address}
                                                            onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                                                            placeholder="Enter full address"
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none h-24"
                                                            required
                                                        />
                                                    </div>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={newAddress.isDefault}
                                                            onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                                        />
                                                        <span className="text-sm text-gray-700">Set as default address</span>
                                                    </label>
                                                    <button
                                                        type="submit"
                                                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
                                                    >
                                                        <FaPlus size={14} />
                                                        Add Address
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* About Content Modal */}
                    <AnimatePresence>
                        {showAboutModal && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/60 z-[60]"
                                    onClick={() => setShowAboutModal(null)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[80vh] bg-white rounded-3xl shadow-2xl z-[70] overflow-hidden flex flex-col"
                                >
                                    <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 flex items-center justify-between">
                                        <h3 className="text-white text-xl font-semibold">{aboutContent[showAboutModal].title}</h3>
                                        <button
                                            onClick={() => setShowAboutModal(null)}
                                            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
                                        >
                                            <FaTimes size={16} />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed font-light">
                                            {aboutContent[showAboutModal].content}
                                        </pre>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
