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

/* eslint-disable no-console */
console.log = () => {};

const app = express();
const httpServer = createServer(app);
// Support multiple frontend origins
const getAllowedOrigins = () => {
  const origins = [
    process.env.CLIENT_URL,
    "https://www.beacompanion.online",
    "https://beacompanion-react.vercel.app",
    "http://localhost:5173", // for local development
  ].filter(Boolean); // Remove undefined values

  return origins.length > 0 ? origins : ["http://localhost:5173"];
};

const allowedOrigins = getAllowedOrigins();

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
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
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Make io accessible to routes
app.set("io", io);

// API Endpoints
app.get("/", (req, res) => res.send("Server Connected"));
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
