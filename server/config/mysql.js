import { Sequelize } from "sequelize";
import "dotenv/config";

// Treat undefined DB_HOST *or* local placeholders (localhost / 127.0.0.1 / ::1) as
// "no external MySQL provided" and fall back to SQLite automatically.
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
  (process.env.DB_HOST || "").toLowerCase()
);

const useSQLite =
  process.env.DB_DIALECT === "sqlite" || !process.env.DB_HOST || isLocalHost;

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
