import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  createMonitoringSession,
  endMonitoringSession,
  getSession,
  getAllMonitoringSessions,
  getPatientSessions,
  updateSessionData,
  getSessionAnalytics,
  monitorAndSaveResult,
} from "../controllers/sessionController.js";

const sessionRouter = express.Router();

// Place /monitor route BEFORE any parameterized routes
sessionRouter.post("/monitor", monitorAndSaveResult);

// Session Management Routes
sessionRouter.post("/", userAuth, createMonitoringSession);
sessionRouter.put("/:sessionId/end", userAuth, endMonitoringSession);
sessionRouter.get("/:sessionId", userAuth, getSession);
sessionRouter.get("/", userAuth, getAllMonitoringSessions);
sessionRouter.get("/patient/:patientId", userAuth, getPatientSessions);
sessionRouter.put("/:sessionId/data", userAuth, updateSessionData);
sessionRouter.get("/:sessionId/analytics", userAuth, getSessionAnalytics);

export default sessionRouter;
