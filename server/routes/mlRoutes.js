import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  analyzeBehavior,
  getModelStatus,
  batchAnalysis,
  evaluateDataset,
  testModels,
} from "../controllers/mlController.js";

const mlRouter = express.Router();

// Middleware for handling large ML data payloads
const mlDataMiddleware = express.json({
  limit: "50mb",
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: "Invalid JSON payload",
      });
      throw new Error("Invalid JSON");
    }
  },
});

// ML Analysis Routes (with authentication and large payload support)
mlRouter.post("/analyze", userAuth, mlDataMiddleware, analyzeBehavior);
mlRouter.get("/status", userAuth, getModelStatus);
mlRouter.post("/batch", userAuth, mlDataMiddleware, batchAnalysis);
mlRouter.post("/evaluate", userAuth, mlDataMiddleware, evaluateDataset);
mlRouter.get("/test", testModels); // No auth required for testing

// Simple health check that doesn't require Python
mlRouter.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "ML service is running",
  });
});

export default mlRouter;
