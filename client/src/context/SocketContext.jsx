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

  const connectSocket = useCallback(() => {
    // Don't connect if no backend URL is available
    if (!backendUrl) {
      console.error("❌ No backend URL available for socket connection");
      setConnectionError("Backend URL not configured");
      return;
    }

    console.log("🔌 Attempting socket connection to:", backendUrl);

    const socketInstance = io(backendUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"], // Allow fallback to polling
      timeout: 10000, // 10 second timeout
      forceNew: true, // Force new connection
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection success
    socketInstance.on("connect", () => {
      console.log("✅ Connected to socket server");
      console.log("Socket ID:", socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);

      // Send user info if logged in
      if (isLoggedIn && userData) {
        socketInstance.emit("user_join", {
          userId: userData.id,
          name: userData.name,
          role: userData.role,
        });
      }
    });

    // Connection error
    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);

      // Show user-friendly error message
      if (error.message.includes("CORS")) {
        toast.error("Connection failed: CORS error");
      } else if (error.message.includes("timeout")) {
        toast.error("Connection failed: Server timeout");
      } else {
        toast.error("Connection failed: " + error.message);
      }
    });

    // Disconnection
    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from socket server. Reason:", reason);
      setIsConnected(false);

      // Auto-reconnect on unexpected disconnections
      if (reason === "io server disconnect") {
        // Server disconnected the socket, reconnect manually
        setTimeout(() => {
          console.log("🔄 Attempting to reconnect...");
          socketInstance.connect();
        }, 1000);
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
      console.log("❌ Failed to reconnect");
      setConnectionError("Failed to reconnect to server");
      toast.error("Unable to reconnect to server");
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

    setSocket(socketInstance);

    return socketInstance;
  }, [backendUrl, isLoggedIn, userData]);

  // Effect to handle socket connection
  useEffect(() => {
    let socketInstance = null;

    if (backendUrl) {
      socketInstance = connectSocket();
    }

    // Cleanup function
    return () => {
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

  // Emit user join when authentication state changes
  useEffect(() => {
    if (socket && isConnected && isLoggedIn && userData) {
      socket.emit("user_join", {
        userId: userData.id,
        name: userData.name,
        role: userData.role,
      });
    } else if (socket && isConnected && !isLoggedIn) {
      socket.emit("user_leave");
    }
  }, [socket, isConnected, isLoggedIn, userData]);

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
