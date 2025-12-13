'use client';

import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

export default function PhoneInput({ value, onChange, placeholder = '300 1234567', required = false, className = '' }: PhoneInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState({
        code: '+92',
        flag: '🇵🇰',
        name: 'Pakistan'
    });

    const countries = [
        { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
        { code: '+1', flag: '🇺🇸', name: 'United States' },
        { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
        { code: '+91', flag: '🇮🇳', name: 'India' },
    ];

    const handleCountrySelect = (country: typeof countries[0]) => {
        setSelectedCountry(country);
        setIsOpen(false);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow numbers
        const cleaned = e.target.value.replace(/\D/g, '');
        onChange(cleaned);
    };

    // Format phone number for display (e.g., 300 1234567)
    const formatPhoneNumber = (num: string) => {
        if (!num) return '';
        if (num.length <= 3) return num;
        return `${num.slice(0, 3)} ${num.slice(3)}`;
    };

    return (
        <div className={`relative ${className}`}>
            <div className="flex items-center gap-2 border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent bg-white">
                {/* Country Selector */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 px-3 py-3 hover:bg-gray-50 transition"
                    >
                        <span className="text-2xl">{selectedCountry.flag}</span>
                        <FaChevronDown className="text-gray-400" size={12} />
                    </button>

                    {/* Dropdown */}
                    {isOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsOpen(false)}
                            />
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-64 max-h-60 overflow-y-auto">
                                {countries.map((country) => (
                                    <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => handleCountrySelect(country)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                                    >
                                        <span className="text-2xl">{country.flag}</span>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{country.name}</p>
                                            <p className="text-sm text-gray-500">{country.code}</p>
                                        </div>
                                        {selectedCountry.code === country.code && (
                                            <div className="w-2 h-2 bg-orange-500 rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Country Code */}
                <span className="text-gray-700 font-medium">{selectedCountry.code}</span>

                {/* Phone Number Input */}
                <input
                    type="tel"
                    value={formatPhoneNumber(value)}
                    onChange={handlePhoneChange}
                    placeholder={placeholder}
                    required={required}
                    className="flex-1 px-3 py-3 outline-none bg-transparent"
                />
            </div>
        </div>
    );
}
