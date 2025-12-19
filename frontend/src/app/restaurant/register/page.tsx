'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/config';
import { FaUtensils, FaStore, FaMapMarkerAlt, FaPhone, FaUser } from 'react-icons/fa';

export default function RestaurantRegister() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        restaurantName: '',
        address: '',
        contact: '',
        cuisine: '',
    });
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log('Registering restaurant owner:', formData);

            // 1. Register the user first
            const { data } = await axios.post(`${API_BASE_URL}/api/auth/register`, {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: 'restaurant'
            });

            // 2. Save user info (including token) to localStorage
            localStorage.setItem('userInfo', JSON.stringify(data));

            // 3. Create the restaurant profile automatically
            // We use the token we just got to authenticate this request
            await axios.post(
                `${API_BASE_URL}/api/restaurants`,
                {
                    name: formData.restaurantName,
                    address: formData.address,
                    contact: formData.contact,
                    description: `Cuisine: ${formData.cuisine}`,
                    location: {
                        type: 'Point',
                        coordinates: [74.3587, 31.5204] // Default to Lahore, user can update later
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${data.token}`
                    }
                }
            );

            // 4. Redirect to dashboard
            router.push('/restaurant');

        } catch (error: any) {
            console.error('Registration failed:', error);
            alert(error.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                        <FaStore size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Partner with Foodswipe</h1>
                    <p className="text-gray-400">Grow your business with video</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Owner Name</label>
                        <div className="relative">
                            <FaUser className="absolute left-3 top-3 text-gray-500" />
                            <input
                                type="text"
                                name="name"
                                placeholder="John Doe"
                                className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Restaurant Name</label>
                        <div className="relative">
                            <FaUtensils className="absolute left-3 top-3 text-gray-500" />
                            <input
                                type="text"
                                name="restaurantName"
                                placeholder="Burger King"
                                className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="partner@example.com"
                            className="w-full bg-gray-700 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            className="w-full bg-gray-700 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Contact</label>
                            <div className="relative">
                                <FaPhone className="absolute left-3 top-3 text-gray-500" />
                                <input
                                    type="text"
                                    name="contact"
                                    placeholder="0300-1234567"
                                    className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Address</label>
                            <div className="relative">
                                <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-500" />
                                <input
                                    type="text"
                                    name="address"
                                    placeholder="Gulberg, Lahore"
                                    className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-red-600 text-white font-bold py-3 rounded-lg transition shadow-lg transform active:scale-95"
                    >
                        Register Restaurant
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-400">
                        Already a partner?{' '}
                        <Link href="/login" className="text-primary hover:underline">
                            Login here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
