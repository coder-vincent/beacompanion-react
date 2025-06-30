import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import {
  createUserSession,
  deleteUserSessionByToken,
  getUserSessionsByUserId,
} from "../models/userSessionModel.js";
import "dotenv/config";
import transporter from "../config/nodemailer.js";

// Get JWT secret with fallback
const getJwtSecret = () => {
  return (
    process.env.JWT_SECRET ||
    "beacompanion_jwt_secret_key_2024_secure_and_random"
  );
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    let existingUser = await userModel.findOne({ where: { email } });

    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: user.id }, getJwtSecret(), {
      expiresIn: "7d",
    });

    // Enhanced cookie settings for cross-domain (registration)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };

    res.cookie("token", token, cookieOptions);
    console.log("🍪 Registration cookie set with options:", cookieOptions);

    // Send email if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: email,
          subject: "Welcome to BEACompanion",
          text: `Welcome to BEACompanion! We're glad to have you on board. This is an automated response, please do not reply.`,
          html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #333;">Hello <span style="color: #2a7ae2;">${name}</span>,</h2>
      <p style="font-size: 16px; color: #444;">
        Welcome to <strong>BEACompanion</strong>! We're glad to have you on board.
      </p>
      <p style="font-size: 14px; color: #888; margin-top: 30px;">
        <i>This is an automated response, please do not reply.</i>
      </p>
    </div>
  `,
        };

        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Don't fail registration if email fails
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    return res.json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const deviceInfo = req.headers["user-agent"] || "Unknown Device";

  if (!email || !password) {
    return res.json({
      success: false,
      message: "Email and Password are required",
    });
  }

  try {
    console.log("🔐 Login attempt for email:", email);

    let user = await userModel.findOne({ where: { email } });
    console.log("👤 User found:", user ? "Yes" : "No");

    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.json({ success: false, message: "Invalid email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔑 Password match:", isMatch ? "Yes" : "No");

    if (!isMatch) {
      console.log("❌ Invalid password for user:", email);
      return res.json({ success: false, message: "Invalid Password" });
    }

    const token = jwt.sign({ id: user.id }, getJwtSecret(), {
      expiresIn: "7d",
    });

    // Create new session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    console.log("💾 Creating user session...");
    await createUserSession({
      userId: user.id,
      token,
      deviceInfo,
      expiresAt,
    });

    // Enhanced cookie settings for cross-domain (login)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };

    res.cookie("token", token, cookieOptions);
    console.log("🍪 Login cookie set with options:", cookieOptions);
    console.log("✅ Login successful for user:", email, "Role:", user.role);
    return res.json({ success: true, role: user.role, token });
  } catch (err) {
    console.error("❌ Login error details:");
    console.error("- Error message:", err.message);
    console.error("- Error code:", err.code);
    console.error("- Error stack:", err.stack);
    console.error("- Database host:", process.env.DB_HOST);
    console.error("- Database name:", process.env.DB_DATABASE);

    return res.json({
      success: false,
      message: `Database error: ${err.message}`,
      details:
        process.env.NODE_ENV === "development"
          ? {
              error: err.message,
              code: err.code,
              host: process.env.DB_HOST,
            }
          : undefined,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const { token } = req.cookies;

    // Delete the specific session
    if (token) {
      await deleteUserSessionByToken(token);
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    console.log("🧹 Cookie cleared for logout");

    return res.json({ success: true, message: "Logout Successfully" });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findByPk(userId);

    if (user.isAccountVerified) {
      return res.json({ success: false, message: "Account Already Verified" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Account Verification OTP",
      text: `Hello ${user.name}, Your OTP is ${otp}. Verify your account using this OTP.`,
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
    <h2 style="color: #333;">Hello <span style="color: #2a7ae2;">${user.name}</span>,</h2>
    <p style="font-size: 16px; color: #444;">
      Your OTP is <strong>${otp}</strong>. Verify your account using this OTP.
    </p>
    <p style="font-size: 14px; color: #888; margin-top: 30px;">
      <i>This is an automated response, please do not reply.</i>
    </p>
  </div>
`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: "Verification OTP sent on email",
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    const user = await userModel.findByPk(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.verifyOtp === "" || user.verifyOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.verifyOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP Expired" });
    }

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;

    await user.save();
    return res.json({ success: true, message: "Email Verified Successfully" });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

export const isAuthenticated = async (req, res) => {
  try {
    // If we reach here, the userAuth middleware has already validated the token
    // req.user contains the user ID from the JWT token
    const { id } = req.user;

    // Get user data from database to return current info
    const user = await userModel.findByPk(id);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    console.log("✅ Authentication check successful for user:", user.email);

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAccountVerified: user.isAccountVerified,
      },
    });
  } catch (err) {
    console.error("❌ Authentication check failed:", err);
    res.json({ success: false, message: err.message });
  }
};

export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  try {
    const user = await userModel.findOne({ where: { email } });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Hello ${user.name}, Your OTP for resetting your password is ${otp}. Use this OTP to proceed with resetting your password`,
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
    <h2 style="color: #333;">Hello <span style="color: #2a7ae2;">${user.name}</span>,</h2>
    <p style="font-size: 16px; color: #444;">
      Your OTP for resetting your password is <strong>${otp}</strong>. Use this OTP to proceed with resetting your password
    </p>
    <p style="font-size: 14px; color: #888; margin-top: 30px;">
      <i>This is an automated response, please do not reply.</i>
    </p>
  </div>
`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.json({
      success: false,
      message: "Email, OTP, and new password are required",
    });
  }

  try {
    const user = await userModel.findOne({ where: { email } });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.resetOtp === "" || user.resetOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.resetOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP Expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;

    await user.save();

    return res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

export const getActiveSessions = async (req, res) => {
  try {
    const { userId } = req.body;

    const sessions = await getUserSessionsByUserId(userId);

    // Filter out expired sessions
    const activeSessions = sessions.filter(
      (session) => new Date(session.expiresAt) > new Date()
    );

    return res.json({
      success: true,
      sessions: activeSessions.map((session) => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        lastActive: session.createdAt,
        expiresAt: session.expiresAt,
      })),
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

export const terminateSession = async (req, res) => {
  try {
    const { sessionId, userId } = req.body;

    const sessions = await getUserSessionsByUserId(userId);
    const session = sessions.find((s) => s.id === parseInt(sessionId));

    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    await deleteUserSessionByToken(session.token);

    return res.json({
      success: true,
      message: "Session terminated successfully",
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};
