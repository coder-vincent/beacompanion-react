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
        ? { ssl: { require: true, rejectUnauthorized: true } }
        : {},
  }
);

// Diagnostic output for troubleshooting
console.error(
  "[DB] Connecting to MySQL:",
  process.env.DB_HOST,
  process.env.DB_PORT || 3306,
  process.env.DB_DATABASE,
  process.env.DB_USER,
  `SSL=${process.env.DB_SSL}`
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");
    return sequelize;
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
};

export { sequelize, connectDB };
export default sequelize;
