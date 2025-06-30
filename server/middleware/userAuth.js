import jwt from "jsonwebtoken";

// Get JWT secret with fallback
const getJwtSecret = () => {
  return (
    process.env.JWT_SECRET ||
    "beacompanion_jwt_secret_key_2024_secure_and_random"
  );
};

const userAuth = async (req, res, next) => {
  // Prefer cookie token, but also support "Authorization: Bearer <token>" header
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  console.log("🔐 Auth middleware - Token present:", token ? "Yes" : "No");
  console.log(
    "🔐 Auth middleware - Cookie token:",
    req.cookies?.token ? "Present" : "Missing"
  );
  console.log("🔐 Auth middleware - Headers:", {
    origin: req.headers.origin,
    cookie: req.headers.cookie ? "Present" : "Missing",
    authorization: req.headers.authorization ? "Present" : "Missing",
  });

  if (!token) {
    console.log("❌ No token found in cookies or headers");
    return res.json({
      success: false,
      message: "Not authorized, login again.",
      details:
        process.env.NODE_ENV === "development"
          ? {
              cookieReceived: !!req.cookies?.token,
              authHeaderReceived: !!req.headers.authorization,
              origin: req.headers.origin,
            }
          : undefined,
    });
  }

  try {
    const tokenDecode = jwt.verify(token, getJwtSecret());
    console.log("✅ Token decoded successfully for user ID:", tokenDecode.id);

    if (tokenDecode.id) {
      req.user = { id: tokenDecode.id };
    } else {
      console.log("❌ No user ID in token");
      return res.json({
        success: false,
        message: "Not authorized, login again.",
      });
    }

    next();
  } catch (err) {
    console.error("❌ Authentication error:", err.message);

    let errorMessage = "Not authorized, login again.";
    if (err.name === "TokenExpiredError") {
      errorMessage = "Session expired, please login again.";
    } else if (err.name === "JsonWebTokenError") {
      errorMessage = "Invalid token, please login again.";
    }

    res.json({
      success: false,
      message: errorMessage,
      details:
        process.env.NODE_ENV === "development"
          ? {
              error: err.message,
              name: err.name,
            }
          : undefined,
    });
  }
};

export default userAuth;
