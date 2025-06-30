/* eslint-disable react-refresh/only-export-components */
import axios from "axios";
import { createContext, useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
  axios.defaults.withCredentials = true;

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(false);

  const getUserData = useCallback(async () => {
    try {
      console.log("👤 Fetching user data...");
      const { data } = await axios.get(backendUrl + "/api/user/data");

      console.log("👤 User data response:", data);

      if (data.success) {
        setUserData(data.userData);
        console.log("✅ User data updated:", data.userData?.email);
      } else {
        console.log("❌ Failed to get user data:", data.message);
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ User data fetch failed:", error);
      console.error("Response data:", error.response?.data);

      // Don't show error for auth failures
      if (!error.response || error.response?.status >= 500) {
        toast.error(error.message);
      }
    }
  }, [backendUrl, setUserData]);

  const getAuthState = useCallback(async () => {
    try {
      console.log("🔐 Checking authentication state...");
      const { data } = await axios.get(backendUrl + "/api/auth/is-auth");

      console.log("🔐 Auth check response:", data);

      if (data.success) {
        console.log("✅ User is authenticated:", data.user?.email);
        setIsLoggedIn(true);

        // If the auth check returned user data, use it directly
        if (data.user) {
          setUserData(data.user);
        } else {
          // Otherwise fetch user data separately
          getUserData();
        }
      } else {
        console.log("❌ User is not authenticated:", data.message);
        setIsLoggedIn(false);
        setUserData(false);
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      console.error("Response data:", error.response?.data);

      setIsLoggedIn(false);
      setUserData(false);

      // Only show error for network issues, not auth failures
      if (error.code === "NETWORK_ERROR" || !error.response) {
        toast.error("Network error: " + error.message);
      } else if (error.response?.status >= 500) {
        toast.error("Server error: " + error.message);
      }
      // Don't show toast for 401/403 errors (normal auth failures)
    }
  }, [backendUrl, getUserData]);

  useEffect(() => {
    getAuthState();

    const socket = io(backendUrl, { withCredentials: true });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server from AppContext");
    });

    socket.on("userListUpdate", () => {
      console.log("Received userListUpdate event in AppContext");
      getUserData();
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server from AppContext");
    });

    return () => {
      socket.disconnect();
    };
  }, [backendUrl, getAuthState, getUserData]);

  const value = {
    backendUrl,
    isLoggedIn,
    setIsLoggedIn,
    userData,
    setUserData,
    getUserData,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};
