import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB, sequelize } from "./config/mysql.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import contentRouter from "./routes/contentRoutes.js";
import mlRouter from "./routes/mlRoutes.js";
import sessionRouter from "./routes/sessionRoutes.js";
import testRouter from "./routes/testRoutes.js";

/* eslint-disable no-console */
// Enable console.log for debugging during startup
if (process.env.NODE_ENV === "production") {
  // Keep console.log enabled in production for debugging
  // console.log = () => {};
}

const app = express();
const httpServer = createServer(app);
// Support multiple frontend origins
const getAllowedOrigins = () => {
  const origins = [
    process.env.CLIENT_URL,
    "https://www.beacompanion.online",
    "https://beacompanion-react.vercel.app",
    "https://beacompanion.vercel.app", // Alternative Vercel domain
    "http://localhost:5173", // for local development
  ].filter(Boolean); // Remove undefined values

  return origins.length > 0 ? origins : ["http://localhost:5173"];
};

const allowedOrigins = getAllowedOrigins();

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
  allowEIO3: true, // Better compatibility
  transports: ["websocket", "polling"],
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
});

const port = process.env.PORT || 4000;

// Initialize database connection and sync models
const initializeServer = async () => {
  try {
    await connectDB();

    // Sync models without altering schema on every start
    await sequelize.sync();
    console.log("Database models synchronized successfully");
    console.log("Allowed CORS origins:", allowedOrigins);

    // Start the server
    httpServer.listen(port, () =>
      console.log(`Server started on port: ${port}`)
    );
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
};

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cookieParser());
app.use(cors(corsOptions));

// Increase JSON body parser limit for large ML data
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Socket.IO connection handling
const connectedUsers = new Map(); // Track connected users

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // Handle user joining
  socket.on("user_join", (userData) => {
    try {
      console.log("👤 User joined:", userData);

      // Store user info with socket
      socket.userId = userData.userId;
      socket.userData = userData;

      // Add to connected users map
      connectedUsers.set(userData.userId, {
        socketId: socket.id,
        userData: userData,
        connectedAt: new Date(),
      });

      // Join user to their own room for targeted messages
      socket.join(`user_${userData.userId}`);

      // Join user to role-based room
      socket.join(`role_${userData.role}`);

      // Broadcast user list update to all clients
      io.emit("userListUpdate", {
        type: "user_joined",
        user: userData,
        connectedUsers: Array.from(connectedUsers.values()).map(
          (u) => u.userData
        ),
      });

      console.log(
        `✅ User ${userData.name} (${userData.role}) joined successfully`
      );
    } catch (error) {
      console.error("❌ Error handling user join:", error);
    }
  });

  // Handle user leaving
  socket.on("user_leave", () => {
    try {
      if (socket.userId) {
        console.log("👋 User leaving:", socket.userData?.name);

        // Remove from connected users
        connectedUsers.delete(socket.userId);

        // Leave rooms
        socket.leave(`user_${socket.userId}`);
        if (socket.userData?.role) {
          socket.leave(`role_${socket.userData.role}`);
        }

        // Broadcast user list update
        io.emit("userListUpdate", {
          type: "user_left",
          user: socket.userData,
          connectedUsers: Array.from(connectedUsers.values()).map(
            (u) => u.userData
          ),
        });
      }
    } catch (error) {
      console.error("❌ Error handling user leave:", error);
    }
  });

  // Handle role changes
  socket.on("role_changed", (newUserData) => {
    try {
      console.log("🔄 User role changed:", newUserData);

      // Leave old role room
      if (socket.userData?.role) {
        socket.leave(`role_${socket.userData.role}`);
      }

      // Update user data
      socket.userData = newUserData;

      // Join new role room
      socket.join(`role_${newUserData.role}`);

      // Update connected users map
      if (connectedUsers.has(newUserData.userId)) {
        connectedUsers.set(newUserData.userId, {
          ...connectedUsers.get(newUserData.userId),
          userData: newUserData,
        });
      }

      // Send role change notification to the specific user
      socket.emit("userDataUpdate", newUserData);

      // Broadcast user list update
      io.emit("userListUpdate", {
        type: "user_updated",
        user: newUserData,
        connectedUsers: Array.from(connectedUsers.values()).map(
          (u) => u.userData
        ),
      });
    } catch (error) {
      console.error("❌ Error handling role change:", error);
    }
  });

  // Handle sending notifications
  socket.on("send_notification", (data) => {
    try {
      const { targetUserId, targetRole, message, type } = data;

      if (targetUserId) {
        // Send to specific user
        io.to(`user_${targetUserId}`).emit("notification", {
          message,
          type: type || "info",
          from: socket.userData?.name || "System",
          timestamp: new Date(),
        });
      } else if (targetRole) {
        // Send to all users with specific role
        io.to(`role_${targetRole}`).emit("notification", {
          message,
          type: type || "info",
          from: socket.userData?.name || "System",
          timestamp: new Date(),
        });
      } else {
        // Broadcast to all connected users
        io.emit("notification", {
          message,
          type: type || "info",
          from: socket.userData?.name || "System",
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("❌ Error sending notification:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    try {
      console.log("🔌 Client disconnected:", socket.id, "Reason:", reason);

      if (socket.userId) {
        console.log("👋 User disconnected:", socket.userData?.name);

        // Remove from connected users
        connectedUsers.delete(socket.userId);

        // Broadcast user list update
        io.emit("userListUpdate", {
          type: "user_disconnected",
          user: socket.userData,
          connectedUsers: Array.from(connectedUsers.values()).map(
            (u) => u.userData
          ),
        });
      }
    } catch (error) {
      console.error("❌ Error handling disconnect:", error);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });
});

// Make io accessible to routes
app.set("io", io);

// API Endpoints
app.get("/", (req, res) => res.send("Server Connected"));
app.use("/api/test", testRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/content", contentRouter);
app.use("/api/ml", mlRouter);
app.use("/api/session", sessionRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error details:", err);

  // Handle JSON parsing errors specifically
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format in request body",
      error: err.message,
    });
  }

  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong!" });
});

// Initialize the server
initializeServer();
