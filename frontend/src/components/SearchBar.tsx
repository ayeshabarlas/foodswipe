'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaHistory, FaFire, FaUtensils } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

interface Suggestion {
    type: 'dish' | 'restaurant';
    name: string;
    id: string;
}

interface SearchBarProps {
    onSearch?: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load recent searches from localStorage
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        // Click outside to close suggestions
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Fetch autocomplete suggestions
        const fetchSuggestions = async () => {
            if (query.length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                const res = await axios.get(`${API_BASE_URL}/api/search/autocomplete?q=${query}`);
                setSuggestions(res.data);
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        };

        const debounce = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        // Add to recent searches
        const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));

        // Trigger search callback
        if (onSearch) {
            onSearch(searchQuery);
        }

        setShowSuggestions(false);
        setIsFocused(false);
    };

    const clearSearch = () => {
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-2xl mx-auto">
            {/* Search Input */}
            <motion.div
                animate={{
                    scale: isFocused ? 1.02 : 1,
                    boxShadow: isFocused
                        ? '0 10px 40px rgba(255, 107, 107, 0.3)'
                        : '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                className="relative"
            >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                    <FaSearch size={20} />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        setIsFocused(true);
                        setShowSuggestions(true);
                    }}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSearch(query);
                        }
                    }}
                    placeholder="Search for dishes or restaurants..."
                    className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-200 rounded-full text-gray-900 placeholder-gray-500 font-medium outline-none focus:border-primary transition-all shadow-sm"
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition"
                    >
                        <FaTimes size={20} />
                    </button>
                )}
            </motion.div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
                {showSuggestions && (isFocused || query) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden z-50"
                    >
                        {/* Autocomplete Suggestions */}
                        {suggestions.length > 0 && (
                            <div className="border-b border-gray-700">
                                <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">
                                    Suggestions
                                </div>
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSearch(suggestion.name)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition text-left"
                                    >
                                        {suggestion.type === 'dish' ? (
                                            <FaUtensils className="text-primary" />
                                        ) : (
                                            <FaFire className="text-accent" />
                                        )}
                                        <div>
                                            <div className="text-white font-medium">{suggestion.name}</div>
                                            <div className="text-xs text-gray-500 capitalize">{suggestion.type}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Recent Searches */}
                        {recentSearches.length > 0 && !query && (
                            <div>
                                <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase flex items-center justify-between">
                                    <span>Recent Searches</span>
                                    <button
                                        onClick={() => {
                                            setRecentSearches([]);
                                            localStorage.removeItem('recentSearches');
                                        }}
                                        className="text-primary hover:text-primary/80 text-xs normal-case"
                                    >
                                        Clear
                                    </button>
                                </div>
                                {recentSearches.map((search, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSearch(search)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition text-left"
                                    >
                                        <FaHistory className="text-gray-500" />
                                        <span className="text-white">{search}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {suggestions.length === 0 && recentSearches.length === 0 && !query && (
                            <div className="px-4 py-8 text-center text-gray-500">
                                <FaSearch className="text-4xl mx-auto mb-2 opacity-50" />
                                <p>Start typing to search</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
