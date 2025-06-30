/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { AppContext } from "./AppContext";
import toast from "react-hot-toast";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { backendUrl, isLoggedIn, userData } = useContext(AppContext);

  const connectSocket = useCallback(async () => {
    // Don't connect if no backend URL is available
    if (!backendUrl) {
      console.error("❌ No backend URL available for socket connection");
      setConnectionError("Backend URL not configured");
      return;
    }

    console.log("🔌 Attempting socket connection to:", backendUrl);

    // Health check before Socket.IO connection
    try {
      const response = await fetch(backendUrl, { method: "HEAD" });
      if (!response.ok) {
        console.warn(
          "⚠️ Backend server not responding, delaying socket connection"
        );
        setConnectionError("Backend server not ready");
        return;
      }
      console.log("✅ Backend health check passed");
    } catch (error) {
      console.warn("⚠️ Backend health check failed:", error.message);
      setConnectionError("Backend server unreachable");
      return;
    }

    const socketInstance = io(backendUrl, {
      withCredentials: true,
      transports: ["polling", "websocket"], // Try polling first (more reliable)
      timeout: 30000, // 30 second timeout (even more time)
      autoConnect: false, // Don't auto-connect immediately
      reconnection: true,
      reconnectionAttempts: 3, // Reduced attempts
      reconnectionDelay: 3000, // 3 second delay
      reconnectionDelayMax: 10000, // Max 10 seconds
      forceNew: false, // Explicitly set to false
      upgrade: true, // Allow transport upgrades
    });

    // Connection success
    socketInstance.on("connect", () => {
      console.log("✅ Connected to socket server");
      console.log("Socket ID:", socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);

      // Send user info if logged in (with delay to ensure stability)
      setTimeout(() => {
        if (isLoggedIn && userData && socketInstance.connected) {
          socketInstance.emit("user_join", {
            userId: userData.id,
            name: userData.name,
            role: userData.role,
          });
        }
      }, 500);
    });

    // Connection error
    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);

      // Only show error toast for persistent failures (not on every retry)
      if (error.message.includes("CORS")) {
        console.warn("CORS error - check server configuration");
      } else if (error.message.includes("timeout")) {
        console.warn("Connection timeout - server may be slow");
      } else {
        console.warn("Connection error:", error.message);
      }
    });

    // Disconnection
    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from socket server. Reason:", reason);
      setIsConnected(false);

      // Only log disconnect reasons, let Socket.IO handle reconnection automatically
      if (reason === "io server disconnect") {
        console.log("🔄 Server initiated disconnect");
      } else if (reason === "transport close") {
        console.log("🔄 Transport closed - network issue");
      } else {
        console.log("🔄 Disconnect reason:", reason);
      }
    });

    // Reconnection attempt
    socketInstance.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    // Reconnection success
    socketInstance.on("reconnect", (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
      toast.success("Connection restored");
    });

    // Reconnection failed
    socketInstance.on("reconnect_failed", () => {
      console.log("❌ Failed to reconnect after all attempts");
      setConnectionError("Failed to reconnect to server");
      // Only show toast after all attempts failed
      toast.error("Connection lost - please refresh page");
    });

    // Custom events
    socketInstance.on("userListUpdate", () => {
      console.log("📝 User list updated");
    });

    socketInstance.on("notification", (data) => {
      console.log("🔔 Notification received:", data);
      if (data.message) {
        toast(data.message, {
          icon: data.type === "error" ? "❌" : "ℹ️",
        });
      }
    });

    // Manually connect after setting up listeners
    socketInstance.connect();

    setSocket(socketInstance);

    return socketInstance;
  }, [backendUrl]); // Remove isLoggedIn, userData from dependencies to prevent reconnections

  // Effect to handle socket connection
  useEffect(() => {
    let socketInstance = null;
    let isCancelled = false;

    const initializeSocket = async () => {
      if (backendUrl && !isCancelled) {
        try {
          socketInstance = await connectSocket();
        } catch (error) {
          console.error("❌ Failed to initialize socket:", error);
          if (!isCancelled) {
            setConnectionError(error.message);
          }
        }
      }
    };

    initializeSocket();

    // Cleanup function
    return () => {
      isCancelled = true;
      if (socketInstance) {
        console.log("🧹 Cleaning up socket connection");
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      }
    };
  }, [connectSocket]);

  // Emit user join when authentication state changes (with stability check)
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleAuthChange = () => {
      if (isLoggedIn && userData) {
        console.log("👤 Sending user_join for:", userData.email);
        socket.emit("user_join", {
          userId: userData.id,
          name: userData.name,
          role: userData.role,
        });
      } else if (!isLoggedIn) {
        console.log("👤 Sending user_leave");
        socket.emit("user_leave");
      }
    };

    // Add small delay to prevent rapid auth state changes
    const timeoutId = setTimeout(handleAuthChange, 300);

    return () => clearTimeout(timeoutId);
  }, [socket, isConnected, isLoggedIn, userData?.id]); // Only track user ID to prevent unnecessary updates

  const value = {
    socket,
    isConnected,
    connectionError,
    reconnect: connectSocket,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
