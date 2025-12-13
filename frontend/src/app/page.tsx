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

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [checkingRestaurant, setCheckingRestaurant] = useState(false);
 useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");
    const token = localStorage.getItem("token");

    // Agar direct "/" visit hua aur user logged in nahi, redirect to /login
    if (!userInfo || !token) {
      router.replace("/login");
    }
  }, []);
  useEffect(() => {
    const checkAuth = async () => {
      const userInfo = localStorage.getItem("userInfo");
      const token = localStorage.getItem("token");

      if (userInfo && token) {
        try {
          // Verify token with backend
          const response = await axios.get("http://localhost:5000/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000 // 5 second timeout
          });

          const user = response.data;
          // Update localStorage with fresh data (including address)
          localStorage.setItem("userInfo", JSON.stringify(user));

          setUserRole(user.role || "customer");
          setIsLoggedIn(true);

          // If admin, allow access to main app (don't redirect)
          if (user.role === "admin") {
            // Optional: You might want to show a link to admin dashboard in the UI instead of redirecting
            // For now, we just let them fall through to the default view
          }

          // If restaurant owner, check if they have a restaurant profile
          if (user.role === "restaurant") {
            console.log('Checking for restaurant for user:', user.email);
            setCheckingRestaurant(true);
            try {
              const restaurantResponse = await axios.get("http://localhost:5000/api/restaurants/my-restaurant", {
                headers: { Authorization: `Bearer ${token}` },
              });
              console.log('Restaurant found:', restaurantResponse.data.name);
              if (restaurantResponse.data) {
                setHasRestaurant(true);
              }
            } catch (error: any) {
              console.log('Restaurant check error:', error.response?.status, error.response?.data);
              if (error.response?.status === 404) {
                console.log('No restaurant found - showing create page');
                setHasRestaurant(false);
              }
            }
            setCheckingRestaurant(false);
          }
        } catch (error) {
          console.error("Session expired or invalid:", error);
          // If verification fails, logout
          localStorage.removeItem("userInfo");
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleRestaurantCreated = () => {
    setHasRestaurant(true);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={async () => {
      // Immediately load user role from localStorage
      const userInfo = localStorage.getItem("userInfo");
      console.log("Login successful, checking redirection for:", userInfo);

      if (userInfo) {
        const user = JSON.parse(userInfo);
        const role = user.role || "customer";
        console.log("Setting user role to:", role);
        setUserRole(role);
        setIsLoggedIn(true);

        // If restaurant owner, check for profile
        if (role === "restaurant") {
          console.log("User is restaurant, checking for existing profile...");
          setCheckingRestaurant(true);
          const token = localStorage.getItem("token");
          try {
            const restaurantResponse = await axios.get("http://localhost:5000/api/restaurants/my-restaurant", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (restaurantResponse.data) {
              console.log("Restaurant profile found");
              setHasRestaurant(true);
            }
          } catch (error: any) {
            console.log("Restaurant profile check failed:", error.message);
            if (error.response?.status === 404) {
              setHasRestaurant(false);
            }
          }
          setCheckingRestaurant(false);
        }
      } else {
        setIsLoggedIn(true);
      }
    }} />;
  }

  // Restaurant owner flow
  if (userRole === "restaurant") {
    if (checkingRestaurant) {
      return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading restaurant...</div>;
    }

    if (!hasRestaurant) {
      return <CreateRestaurant onRestaurantCreated={handleRestaurantCreated} />;
    }

    return <RestaurantDashboard />;
  }

  // Rider flow
  if (userRole === "rider") {
    return <RiderPortal />;
  }

  if (userRole === "admin") {
    // Force reset checking restaurant to false as admins don't need it
    if (checkingRestaurant) setCheckingRestaurant(false);

    // Allow admin to see the main feed, maybe add an Admin Dashboard button overlap later?
    // For now, just render the feed.
    return (
      <main className="h-screen w-full bg-black overflow-hidden relative">
        <div className="absolute top-4 right-4 z-50">
          <button onClick={() => router.push('/admin')} className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg font-bold text-sm">
            Go to Admin Dashboard
          </button>
        </div>
        <VideoFeed />
      </main>
    );
  }

  // Customer feed for customers
  if (userRole === "customer") {
    return (
      <main className="h-screen w-full bg-black overflow-hidden">
        <VideoFeed />
      </main>
    );
  }

  // Fallback for debugging - prevent silent failure
  return (
    <div className="h-screen w-full bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="mb-4 text-xl font-bold text-red-500">Navigation Error</div>
      <p className="mb-4">Logged in but no matching view found.</p>
      <div className="bg-gray-800 p-4 rounded-lg mb-6 font-mono text-sm border border-gray-700">
        <p>Current Role: <span className="text-yellow-400">"{userRole || 'undefined'}"</span></p>
        <p>Has Restaurant: <span className="text-blue-400">{hasRestaurant ? 'Yes' : 'No'}</span></p>
      </div>
      <button
        onClick={() => {
          localStorage.removeItem("userInfo");
          localStorage.removeItem("token");
          window.location.reload();
        }}
        className="px-6 py-3 bg-red-600 rounded-full font-bold hover:bg-red-700 transition"
      >
        Logout & Retry
      </button>
    </div>
  );
}
