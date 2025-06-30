import { Sequelize } from "sequelize";
import "dotenv/config";

// ---------------------------------------------------------------------------
// MySQL connection only – SQLite fallback removed
// ---------------------------------------------------------------------------

if (!process.env.DB_HOST) {
  throw new Error("DB_HOST environment variable is required but not set.");
}

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    dialectOptions:
      process.env.DB_SSL === "true"
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false, // Changed for compatibility with some hosting providers
            },
          }
        : {},
  }
);

// Diagnostic output for troubleshooting
console.log("🔍 [DB] Configuration check:");
console.log("- Host:", process.env.DB_HOST || "❌ NOT SET");
console.log("- Port:", process.env.DB_PORT || 3306);
console.log("- Database:", process.env.DB_DATABASE || "❌ NOT SET");
console.log("- User:", process.env.DB_USER || "❌ NOT SET");
console.log("- Password:", process.env.DB_PASS ? "✅ Set" : "❌ NOT SET");
console.log("- SSL:", process.env.DB_SSL || "false");
console.log("- NODE_ENV:", process.env.NODE_ENV || "not set");

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");
    return sequelize;
  } catch (err) {
    console.error("Database connection failed:");
    console.error("Error details:", err.message);
    console.error("Connection config:");
    console.error("- Host:", process.env.DB_HOST);
    console.error("- Port:", process.env.DB_PORT || 3306);
    console.error("- Database:", process.env.DB_DATABASE);
    console.error("- User:", process.env.DB_USER);
    console.error("- SSL:", process.env.DB_SSL);
    throw err;
  }
};

export { sequelize, connectDB };
export default sequelize;
