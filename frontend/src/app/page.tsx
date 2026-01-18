"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VideoFeed from "@/components/VideoFeed";
import LoginScreen from "@/components/LoginScreen";
import SplashScreen from "@/components/SplashScreen";
import RestaurantDashboard from "@/components/RestaurantDashboard";
import CreateRestaurant from "@/components/CreateRestaurant";
import RiderPortal from "@/components/RiderPortal";
import axios from "axios";
import { API_BASE_URL } from "@/utils/config";

// Force redeploy trigger - 2026-01-15 11:05
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    console.log("Foodswipe Main Page - Deployment Version 2.0 (Proxy Fixed)");
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [checkingRestaurant, setCheckingRestaurant] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const userInfoStr = localStorage.getItem("userInfo");
      let token = localStorage.getItem("token");
      
      if (userInfoStr && token) {
        try {
          const ui = JSON.parse(userInfoStr);
          if (ui.role) {
            setUserRole(ui.role);
            if (ui.role === "restaurant") setHasRestaurant(true);
            setIsLoggedIn(true);
          }
        } catch (e) {}
      }

      // Background re-validation
      if (token) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000 
          });

          const user = response.data;
          const ui = JSON.parse(localStorage.getItem("userInfo") || '{}');
          const updated = { ...ui, ...user };
          localStorage.setItem("userInfo", JSON.stringify(updated));
          
          if (updated.role !== userRole) {
            setUserRole(updated.role);
          }
          if (updated.role === "restaurant") {
            setHasRestaurant(true);
          }
        } catch (error: any) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.clear();
            setIsLoggedIn(false);
            setUserRole("");
          }
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []); // Empty dependency array to run only once on mount

  // Admin flow redirect hook - moved here to follow rules of hooks
  useEffect(() => {
    const adminRoles = ["admin", "super-admin", "finance-admin", "support-admin", "restaurant-manager"];
    const isAdmin = adminRoles.includes(userRole);
    if (isAdmin) {
      router.push('/admin');
    }
  }, [userRole, router]);

  const handleRestaurantCreated = () => {
    setHasRestaurant(true);
    localStorage.setItem("hasRestaurant", "true");
  };

  // Show splash screen until both timer is done AND loading is finished
  if (showSplash || loading) {
    return <SplashScreen onComplete={() => setShowSplash(false)} isLoading={loading} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(userInfoFromLogin) => {
      const userInfo = userInfoFromLogin;
      if (userInfo && userInfo.role) {
        const role = userInfo.role;
        
        // Use functional updates or batch them
        // In React 18, these are batched automatically
        setUserRole(role);
        if (role === "restaurant") setHasRestaurant(true);
        setIsLoggedIn(true);

        // Update localStorage
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
        if (userInfo.token) localStorage.setItem("token", userInfo.token);
      } else {
        setIsLoggedIn(true);
      }
    }} />;
  }

  // Debugging log to track rendering
  console.log("Rendering Home - Role:", userRole, "Logged In:", isLoggedIn, "Has Restaurant:", hasRestaurant);

  // Restaurant owner flow
  if (userRole === "restaurant") {
    return (
      <div className="min-h-screen w-full bg-black">
        <RestaurantDashboard />
      </div>
    );
  }

  // Rider flow
  if (userRole === "rider") {
    return (
      <div className="min-h-screen w-full bg-black">
        <RiderPortal />
      </div>
    );
  }

  if (["admin", "super-admin", "finance-admin", "support-admin", "restaurant-manager"].includes(userRole)) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Redirecting to Admin Panel...</p>
        </div>
      </div>
    );
  }

  // Customer feed for customers
  if (userRole === "customer") {
    return (
      <main className="min-h-screen w-full bg-black overflow-hidden">
        <VideoFeed />
      </main>
    );
  }

  // Fallback for unknown roles or session cleanup
  return (
    <div className="min-h-screen w-full bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="mb-4 text-xl font-bold text-red-500">Navigation Error</div>
      <p className="mb-4 text-center text-gray-400 max-w-md">
        You are logged in as <span className="text-yellow-400 font-mono">{userRole || "Unknown Role"}</span>,
        but the system couldn't find a matching dashboard.
      </p>
      <button
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
      >
        Logout & Retry
      </button>
    </div>
  );
}

