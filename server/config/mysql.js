import { Sequelize } from "sequelize";
import "dotenv/config";

// Prefer MySQL when a host is explicitly provided. Otherwise, default to SQLite.
// This prevents crashes in production platforms (e.g. Render) where no MySQL
// service is provisioned but NODE_ENV is automatically set to "production".
const useSQLite = process.env.DB_DIALECT === "sqlite" || !process.env.DB_HOST;

const sequelize = useSQLite
  ? new Sequelize({ dialect: "sqlite", storage: "dev.db.sqlite" })
  : new Sequelize(
      process.env.DB_DATABASE || "beacompanion",
      process.env.DB_USER || "root",
      process.env.DB_PASS || "",
      { host: process.env.DB_HOST || "localhost", dialect: "mysql" }
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
