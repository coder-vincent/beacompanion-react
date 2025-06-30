import express from "express";
import { sequelize } from "../config/mysql.js";
import userModel from "../models/userModel.js";

const testRouter = express.Router();

// Test database connectivity
testRouter.get("/db-test", async (req, res) => {
  try {
    // Test basic connection
    await sequelize.authenticate();

    // Test user table access
    const userCount = await userModel.count();

    res.json({
      success: true,
      message: "Database connection successful",
      details: {
        connection: "✅ Connected",
        userTable: "✅ Accessible",
        userCount: userCount,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        ssl: process.env.DB_SSL,
      },
    });
  } catch (error) {
    console.error("Database test failed:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
      details: {
        connection: "❌ Failed",
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        ssl: process.env.DB_SSL,
        errorCode: error.code,
        errorNumber: error.errno,
      },
    });
  }
});

// Test environment variables
testRouter.get("/env-test", (req, res) => {
  res.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST ? "✅ Set" : "❌ Missing",
      DB_DATABASE: process.env.DB_DATABASE ? "✅ Set" : "❌ Missing",
      DB_USER: process.env.DB_USER ? "✅ Set" : "❌ Missing",
      DB_PASS: process.env.DB_PASS ? "✅ Set" : "❌ Missing",
      DB_SSL: process.env.DB_SSL,
      CLIENT_URL: process.env.CLIENT_URL,
      JWT_SECRET: process.env.JWT_SECRET ? "✅ Set" : "❌ Missing",
    },
  });
});

// Test cookies and headers
testRouter.get("/cookie-test", (req, res) => {
  res.json({
    success: true,
    request: {
      origin: req.headers.origin,
      userAgent: req.headers["user-agent"],
      cookie: req.headers.cookie,
      authorization: req.headers.authorization,
      referer: req.headers.referer,
      host: req.headers.host,
    },
    cookies: req.cookies,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      CLIENT_URL: process.env.CLIENT_URL,
    },
  });
});

// Test authentication with detailed logging
testRouter.get("/auth-test", async (req, res) => {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    res.json({
      success: true,
      authentication: {
        tokenPresent: !!token,
        tokenSource: req.cookies?.token
          ? "cookie"
          : req.headers.authorization
          ? "header"
          : "none",
        cookieHeader: req.headers.cookie,
        authHeader: req.headers.authorization,
        origin: req.headers.origin,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default testRouter;
