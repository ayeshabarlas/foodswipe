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

  // Safety timeout to prevent getting stuck on loading screen
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (checkingRestaurant) {
      timeout = setTimeout(() => {
        console.warn("Safety timeout: Force clearing checkingRestaurant state");
        setCheckingRestaurant(false);
      }, 15000); // 15 seconds safety net
    }
    return () => clearTimeout(timeout);
  }, [checkingRestaurant]);

  useEffect(() => {
    const checkAuth = async () => {
      const userInfoStr = localStorage.getItem("userInfo");
      let token = localStorage.getItem("token");
      
      // Proactively recover token from userInfo if missing in standalone localStorage
      if (userInfoStr && !token) {
        try {
          const ui = JSON.parse(userInfoStr);
          if (ui.token) {
            token = ui.token;
            localStorage.setItem("token", token);
          }
        } catch (e) {}
      }

      // 1. IMMEDIATE RENDER FROM LOCAL CACHE
      if (userInfoStr && token) {
        try {
          const ui = JSON.parse(userInfoStr);
          if (ui.role === "restaurant") {
            setUserRole("restaurant");
            setHasRestaurant(true); // Trust the role, show dashboard
            setIsLoggedIn(true);
            setLoading(false); // STOP LOADING EARLY
          } else if (ui.role) {
            setUserRole(ui.role);
            setIsLoggedIn(true);
            setLoading(false);
          }
        } catch (e) {}
      }

      // 2. BACKGROUND RE-VALIDATION
      if (userInfoStr && token) {
        try {
          console.log("Home: Starting background re-validation...");
          const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000 
          });

          const user = response.data;
          console.log("Home: Re-validation success, user data:", user);
          const ui = JSON.parse(userInfoStr || '{}');
          const updated = { ...ui, ...user };
          localStorage.setItem("userInfo", JSON.stringify(updated));
          
          // Update state if needed
          if (updated.role !== userRole) {
            console.log(`Home: Role changed from ${userRole} to ${updated.role}`);
            setUserRole(updated.role);
          }
          
          if (updated.role === "restaurant") {
             setHasRestaurant(true);
          }
        } catch (error: any) {
          console.error("Home: Auth background re-validation failed:", error.response?.data || error.message);
          // If 401/403, the token is invalid
          if (error.response?.status === 401 || error.response?.status === 403) {
             console.warn("Home: Token invalid, logging out...");
             // Only logout if we are not in a transient error state
             // localStorage.clear();
             // setIsLoggedIn(false);
          }
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleRestaurantCreated = () => {
    setHasRestaurant(true);
    localStorage.setItem("hasRestaurant", "true");
  };

  // Show splash screen until both timer is done AND loading is finished
  if (showSplash || loading) {
    return <SplashScreen onComplete={() => setShowSplash(false)} isLoading={loading} />;
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
          alert(`Login Error: No user role found in response.\nPlease contact support.`);
          return;
        }

        console.log("Login successful. Role:", role);

        // Update localStorage first
        const existingUserInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
        const updatedUserInfo = { ...existingUserInfo, ...userInfo };
        localStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
        if (userInfo.token) {
          localStorage.setItem("token", userInfo.token);
        }

        // If restaurant owner, show dashboard IMMEDIATELY
        if (role === "restaurant") {
          setUserRole(role);
          setHasRestaurant(true); // Always default to dashboard
          setIsLoggedIn(true);
          
          // Just update cache in background, don't trigger state changes that might redirect back
          const token = userInfo.token || localStorage.getItem("token");
          axios.get(`${API_BASE_URL}/api/restaurants/my-restaurant`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
          }).then(res => {
            if (res.data) {
              localStorage.setItem("hasRestaurant", "true");
            }
          }).catch(err => {
             console.log("Login-time background check failed:", err.message);
          });
        } else {
          setUserRole(role);
          setIsLoggedIn(true);
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
       // Show dashboard by default for restaurant roles to avoid flicker
       // Only show CreateRestaurant if we explicitly know hasRestaurant is false
       if (hasRestaurant || localStorage.getItem("hasRestaurant") === "true") {
         return (
           <div className="h-screen w-full bg-black overflow-hidden">
             <RestaurantDashboard />
           </div>
         );
       }
 
       return (
         <div className="h-screen w-full bg-black overflow-y-auto">
           <CreateRestaurant onRestaurantCreated={handleRestaurantCreated} />
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

  // Admin flow
  if (userRole === "admin") {
    return (
      <div className="h-screen w-full bg-black overflow-y-auto">
        <div className="p-8 text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
          <p className="mb-8">Redirecting to Admin Panel...</p>
          <button 
            onClick={() => router.push('/admin')}
            className="px-6 py-2 bg-orange-500 rounded-lg"
          >
            Go to Admin Dashboard
          </button>
        </div>
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

