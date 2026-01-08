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
  useEffect(() => {
    const checkAuth = async () => {
      const userInfoStr = localStorage.getItem("userInfo");
      let token = localStorage.getItem("token");
      const savedHasRestaurant = localStorage.getItem("hasRestaurant") === "true";

      if (userInfoStr && !token) {
        try {
          const ui = JSON.parse(userInfoStr);
          if (ui.token) {
            token = ui.token;
            localStorage.setItem("token", token);
          }
        } catch (e) {}
      }

      // Proactively set logged in state if we have a token and user info
      if (userInfoStr && token) {
        try {
          const existingUserInfo = JSON.parse(userInfoStr);
          if (existingUserInfo && existingUserInfo.role) {
            setUserRole(existingUserInfo.role);
            setIsLoggedIn(true);
            if (existingUserInfo.role === "restaurant" && savedHasRestaurant) {
              setHasRestaurant(true);
            }
          }
        } catch (e) {
          console.error("Error parsing existing userInfo:", e);
        }

        try {
          // Verify token with backend
          const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000 
          });

          const user = response.data;
          const existingUserInfo = JSON.parse(userInfoStr || '{}');
          const updatedUserInfo = { ...existingUserInfo, ...user };

          localStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
          setUserRole(updatedUserInfo.role || existingUserInfo.role);
          setIsLoggedIn(true);

          if (updatedUserInfo.role === "restaurant") {
            // Only show loader if we don't already know we have a restaurant
            if (!savedHasRestaurant) {
              setCheckingRestaurant(true);
            }
            try {
              const restaurantResponse = await axios.get(`${API_BASE_URL}/api/restaurants/my-restaurant`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (restaurantResponse.data) {
                setHasRestaurant(true);
                localStorage.setItem("hasRestaurant", "true");
              }
            } catch (error: any) {
              if (error.response?.status === 404) {
                setHasRestaurant(false);
                localStorage.removeItem("hasRestaurant");
              }
            }
            setCheckingRestaurant(false);
          }
        } catch (error: any) {
          console.error("Session verification failed:", error.message);
          
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log("Authentication expired - logging out");
            localStorage.removeItem("userInfo");
            localStorage.removeItem("token");
            setIsLoggedIn(false);
            setUserRole("");
          } else {
            // Network error - we already set isLoggedIn to true above, so just keep it
            console.log("Network issue - maintaining local session");
          }
        }
      } else {
        setIsLoggedIn(false);
        setUserRole("");
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleRestaurantCreated = () => {
    setHasRestaurant(true);
    localStorage.setItem("hasRestaurant", "true");
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={async (userInfoFromLogin) => {
      // Use passed info directly as the primary source of truth
      // Fallback to localStorage ONLY if userInfoFromLogin is missing
      const userInfoStr = localStorage.getItem("userInfo");
      const userInfo = userInfoFromLogin || (userInfoStr ? JSON.parse(userInfoStr) : null);

      console.log("Login successful, checking redirection for:", userInfo);

      if (userInfo) {
        // Ensure we strictly use the role from the login response
        const role = userInfo.role;

        if (!role) {
          console.error("CRITICAL ERROR: No role found in userInfo:", userInfo);
          // More descriptive alert for debugging
          alert(`Login Error: No user role found in response.\nUser Info: ${JSON.stringify(userInfo, null, 2)}\nPlease contact support.`);
          return;
        }

        console.log("Setting user role to:", role);
        setUserRole(role);

        // Also update the state used for session checks
        const existingUserInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
        const updatedUserInfo = { ...existingUserInfo, ...userInfo };
        localStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));

        setIsLoggedIn(true);

        // If restaurant owner, check for profile
        if (role === "restaurant") {
          console.log("User is restaurant, checking for existing profile...");
          setCheckingRestaurant(true);
          const token = localStorage.getItem("token");
          try {
            const restaurantResponse = await axios.get(`${API_BASE_URL}/api/restaurants/my-restaurant`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (restaurantResponse.data) {
              console.log("Restaurant profile found");
              setHasRestaurant(true);
              localStorage.setItem("hasRestaurant", "true");
            }
          } catch (error: any) {
            console.log("Restaurant profile check failed:", error.message);
            if (error.response?.status === 404) {
              setHasRestaurant(false);
              localStorage.removeItem("hasRestaurant");
            }
          }
          setCheckingRestaurant(false);
        }
      } else {
        setIsLoggedIn(true);
      }
    }} />;
  }

  // Debugging log to track rendering
  console.log("Rendering Home - Role:", userRole, "Logged In:", isLoggedIn, "Has Restaurant:", hasRestaurant);

  // Restaurant owner flow
  if (userRole === "restaurant") {
    if (checkingRestaurant) {
      return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="animate-pulse">Loading restaurant dashboard...</p>
        </div>
      );
    }

    if (!hasRestaurant) {
      return (
        <div className="h-screen w-full bg-black overflow-y-auto">
          <CreateRestaurant onRestaurantCreated={handleRestaurantCreated} />
        </div>
      );
    }

    return (
      <div className="h-screen w-full bg-black overflow-hidden">
        <RestaurantDashboard />
      </div>
    );
  }

  // Rider flow
  if (userRole === "rider") {
    return (
      <div className="h-screen w-full bg-black overflow-y-auto">
        <RiderPortal />
      </div>
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

  // Fallback for unknown roles or session cleanup
  return (
    <div className="h-screen w-full bg-gray-900 text-white flex flex-col items-center justify-center p-4">
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

