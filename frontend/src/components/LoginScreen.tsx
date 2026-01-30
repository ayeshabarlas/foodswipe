"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaEnvelope, FaUser, FaPhone, FaGoogle, FaArrowLeft, FaStore, FaMotorcycle } from "react-icons/fa";
import axios from "axios";
import { getApiUrl } from "../utils/config";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
// Removed PhoneInput import as we are removing phone requirement
// import PhoneInput from './PhoneInput';

interface LoginScreenProps {
    onLogin: (data: any) => void;
}

type Step = "method" | "signup" | "login" | "otp";
type LoginMethod = "email"; // Removed 'phone' method for simplicity as per request
type Role = "customer" | "restaurant" | "rider";

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [step, setStep] = useState<Step>("method");
    const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
    const [selectedRole, setSelectedRole] = useState<Role>("customer");
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        // Removed phone, confirmPassword, otp
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const checkForceUpdate = async () => {
            try {
                const { data } = await axios.get(`${getApiUrl()}/api/admin/settings/public`);
                if (data.appConfig?.forceUpdate) {
                    const currentVersion = '1.0.0'; // Should come from app config/package.json
                    if (data.appConfig.minVersion > currentVersion) {
                        alert(`Please update the app to continue. Current version: ${currentVersion}, Required: ${data.appConfig.minVersion}`);
                        if (data.appConfig.androidLink) {
                            window.location.href = data.appConfig.androidLink;
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking force update:', error);
            }
        };
        checkForceUpdate();
    }, []);

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            setError("");

            console.log('Starting Google Sign-In with popup...');
            const result = await signInWithPopup(auth, googleProvider);

            console.log('Google sign-in successful! User:', result.user.email);
            const user = result.user;
            
            // CRITICAL: Refresh token to ensure it's not expired
            const idToken = await user.getIdToken(true); 

            console.log('Sending token to backend...');
            const response = await axios.post(`${getApiUrl()}/api/auth/verify-firebase-token`, {
                idToken,
                name: user.displayName || 'Google User',
                email: user.email || '',
                phone: user.phoneNumber || '',
                role: selectedRole
            });

            const userResponse = response.data.user;
            const userInfo = { ...userResponse, token: response.data.token };

            if (!userInfo.role && selectedRole) {
                userInfo.role = selectedRole;
            }

            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            localStorage.setItem('token', response.data.token);

            setTimeout(() => onLogin(userInfo), 100);
        } catch (error: any) {
            console.error('Google sign-in error:', error);
            setLoading(false);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError(error.message || 'Google sign-in failed.');
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const firstName = formData.firstName.trim();
            const lastName = formData.lastName.trim();
            const email = formData.email.trim().toLowerCase();
            const password = formData.password;

            if (!firstName || !lastName) {
                setError("Please enter both first and last name.");
                setLoading(false);
                return;
            }
            if (!email || !email.includes('@') || email.length < 5) {
                setError("Please enter a valid email address.");
                setLoading(false);
                return;
            }
            if (!password || password.length < 6) {
                setError("Password must be at least 6 characters long.");
                setLoading(false);
                return;
            }

            console.log(`[DEBUG] Attempting signup for role: ${selectedRole}`);
            // Direct register without OTP or Phone
            const res = await axios.post(`${getApiUrl()}/api/auth/register`, {
                name: `${firstName} ${lastName}`,
                email: email,
                password: password,
                role: selectedRole,
            });

            const { token, ...userData } = res.data;
            const userInfo = { ...userData, token };

            localStorage.setItem("userInfo", JSON.stringify(userInfo));
            localStorage.setItem("token", token);

            console.log("✅ Signup successful.");
            onLogin(userInfo);
        } catch (err: any) {
            console.error("Signup error:", err);
            setError(err.response?.data?.message || "Failed to sign up");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (!formData.password) {
                setError("Password is required for login");
                return;
            }
            const res = await axios.post(`${getApiUrl()}/api/auth/login`, {
                identifier: formData.email,
                password: formData.password,
                role: selectedRole,
            });

            const { token, ...userData } = res.data;
            const userInfo = { ...userData, token };

            localStorage.setItem("userInfo", JSON.stringify(userInfo));
            localStorage.setItem("token", token);

            console.log("✅ Login successful.");
            setTimeout(() => onLogin(userInfo), 100);
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.response?.data?.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Background (copied from SplashScreen for consistency) */}
            <div className="fixed inset-0 -z-10">
                <img
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80"
                    alt="Food background"
                    className="absolute inset-0 w-full h-full object-cover blur-[2px] scale-110 opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/90 via-red-500/90 to-pink-500/90" />
                <div className="absolute inset-0 bg-black/10" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden my-8"
            >
                {/* Header */}
                <div className="text-center p-8 bg-gradient-to-r from-orange-500 to-pink-500">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {step === "method" ? "Welcome Back!" : step === "signup" ? "Sign Up" : "Login"}
                    </h1>
                    <p className="text-white/90 text-sm">
                        {step === "method" ? "Login to continue" : step === "signup" ? "Create your account" : "Enter your credentials"}
                    </p>
                </div>

                {/* Main Content */}
                <div className="p-8">
                    {step !== "method" && (
                        <button
                            onClick={() => setStep("method")}
                            className="mb-4 text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm"
                        >
                            <FaArrowLeft /> Back
                        </button>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded relative">
                            <p className="font-bold">{error}</p>
                            <button 
                                onClick={async () => {
                                    try {
                                        setError("Checking connection...");
                                        const res = await axios.get(`${getApiUrl()}/health?t=${Date.now()}`);
                                        const data = res.data;
                                        let msg = `Backend: ${data.status}\nDB: ${data.db}\nFirebase: ${data.firebase}\nURL: ${getApiUrl()}`;
                                        alert(msg);
                                        setError("");
                                    } catch (e: any) {
                                        console.error(e);
                                        alert(`Backend unreachable!\nURL: ${getApiUrl()}\nError: ${e.message}`);
                                        setError(`Offline: ${e.message}`);
                                    }
                                }}
                                className="mt-2 text-xs font-bold underline hover:text-red-900"
                            >
                                Check Connectivity
                            </button>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === "method" && (
                            <motion.div
                                key="method"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col gap-6"
                            >
                                {/* Role Selection */}
                                <div>
                                    <p className="text-gray-700 font-medium mb-3 text-sm">Continue as:</p>
                                    <div className="flex gap-3 justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole("customer")}
                                            className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 border-2 rounded-2xl transition-all ${selectedRole === "customer"
                                                ? "border-transparent bg-gradient-to-br from-orange-500/10 to-pink-500/10 ring-2 ring-orange-500"
                                                : "border-gray-100 bg-white hover:border-gray-200"
                                                }`}
                                        >
                                            <FaUser className={`text-2xl ${selectedRole === "customer" ? "text-orange-500" : "text-gray-400"}`} />
                                            <span className={`text-xs font-bold ${selectedRole === "customer" ? "text-orange-600" : "text-gray-500"}`}>
                                                Customer
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole("restaurant")}
                                            className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 border-2 rounded-2xl transition-all ${selectedRole === "restaurant"
                                                ? "border-transparent bg-gradient-to-br from-orange-500/10 to-pink-500/10 ring-2 ring-orange-500"
                                                : "border-gray-100 bg-white hover:border-gray-200"
                                                }`}
                                        >
                                            <FaStore className={`text-2xl ${selectedRole === "restaurant" ? "text-orange-500" : "text-gray-400"}`} />
                                            <span className={`text-xs font-bold ${selectedRole === "restaurant" ? "text-orange-600" : "text-gray-500"}`}>
                                                Restaurant
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole("rider")}
                                            className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 border-2 rounded-2xl transition-all ${selectedRole === "rider"
                                                ? "border-transparent bg-gradient-to-br from-orange-500/10 to-pink-500/10 ring-2 ring-orange-500"
                                                : "border-gray-100 bg-white hover:border-gray-200"
                                                }`}
                                        >
                                            <FaMotorcycle className={`text-2xl ${selectedRole === "rider" ? "text-orange-500" : "text-gray-400"}`} />
                                            <span className={`text-xs font-bold ${selectedRole === "rider" ? "text-orange-600" : "text-gray-500"}`}>
                                                Rider
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Login Methods */}
                                <div>
                                    <p className="text-gray-700 font-medium mb-3 text-sm">Login with:</p>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            type="button"
                                            onClick={handleGoogleSignIn}
                                            disabled={loading}
                                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <FaGoogle className="text-red-500" /> {loading ? 'Signing in...' : 'Continue with Google'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStep("login")}
                                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition shadow-sm"
                                        >
                                            <FaEnvelope className="text-gray-500" /> Continue with Email
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === "signup" && (
                            <motion.form
                                key="signup"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleSignup}
                                className="flex flex-col gap-4"
                            >
                                <div className="flex gap-3">
                                    <div className="relative group flex-1">
                                        <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                        <input
                                            type="text"
                                            name="firstName"
                                            placeholder="First Name"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className="w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 py-3 text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="relative group flex-1">
                                        <input
                                            type="text"
                                            name="lastName"
                                            placeholder="Last Name"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="relative group">
                                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full rounded-full border border-gray-200 bg-white pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                        required
                                    />
                                </div>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full rounded-full border border-gray-200 bg-white pl-4 pr-4 py-3 text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 mt-2"
                                >
                                    {loading ? "Creating Account..." : "Create Account"}
                                </button>
                                <div className="text-center mt-2">
                                    <p className="text-sm text-gray-500">
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => setStep("login")}
                                            className="text-orange-500 font-bold hover:underline"
                                        >
                                            Log in
                                        </button>
                                    </p>
                                </div>
                            </motion.form>
                        )}

                        {step === "login" && (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col gap-4"
                            >
                                {/* Role Indicator */}
                                <div className="text-center mb-2">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Logging in as</span>
                                    <div className={`mt-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${selectedRole === 'restaurant' ? 'bg-orange-100 text-orange-600' :
                                        selectedRole === 'rider' ? 'bg-blue-100 text-blue-600' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {selectedRole === 'restaurant' && <FaStore />}
                                        {selectedRole === 'rider' && <FaMotorcycle />}
                                        {selectedRole === 'customer' && <FaUser />}
                                        {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                                    </div>
                                </div>

                                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                    <div className="relative group">
                                        <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Email address"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full rounded-full border border-gray-200 bg-white pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="password"
                                            name="password"
                                            placeholder="Password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full rounded-full border border-gray-200 bg-white pl-4 pr-4 py-3 text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 mt-2"
                                    >
                                        {loading ? "Logging in..." : "Login"}
                                    </button>
                                    <div className="text-center mt-2">
                                        <p className="text-sm text-gray-500">
                                            Don't have an account?{" "}
                                            <button
                                                type="button"
                                                onClick={() => setStep("signup")}
                                                className="text-orange-500 font-bold hover:underline"
                                            >
                                                Sign up
                                            </button>
                                        </p>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
