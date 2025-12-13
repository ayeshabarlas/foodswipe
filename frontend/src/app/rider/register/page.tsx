'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaMotorcycle, FaIdCard, FaUser, FaPhone } from 'react-icons/fa';

export default function RiderRegister() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        vehicleType: 'Bike',
        licenseNumber: '',
    });
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log('Registering rider:', formData);
            // Mock success
            localStorage.setItem('userInfo', JSON.stringify({ name: formData.name, email: formData.email, role: 'rider' }));
            router.push('/rider');
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                        <FaMotorcycle size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Become a Rider</h1>
                    <p className="text-gray-400">Deliver food, earn money</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                        <div className="relative">
                            <FaUser className="absolute left-3 top-3 text-gray-500" />
                            <input
                                type="text"
                                name="name"
                                placeholder="John Doe"
                                className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            placeholder="rider@example.com"
                            className="w-full bg-gray-700 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full bg-gray-700 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Vehicle Type</label>
                            <select
                                name="vehicleType"
                                className="w-full bg-gray-700 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={handleChange}
                            >
                                <option value="Bike">Bike</option>
                                <option value="Cycle">Cycle</option>
                                <option value="Car">Car</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Phone</label>
                            <div className="relative">
                                <FaPhone className="absolute left-3 top-3 text-gray-500" />
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="0300..."
                                    className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">License Number</label>
                        <div className="relative">
                            <FaIdCard className="absolute left-3 top-3 text-gray-500" />
                            <input
                                type="text"
                                name="licenseNumber"
                                placeholder="LIC-12345678"
                                className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg transform active:scale-95"
                    >
                        Register as Rider
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-400">
                        Already a rider?{' '}
                        <Link href="/login" className="text-blue-400 hover:underline">
                            Login here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
