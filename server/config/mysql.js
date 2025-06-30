import { Sequelize } from "sequelize";
import "dotenv/config";

// If explicit dialect is set to sqlite or if running in CI/Local env without MySQL,
// gracefully fall back to an in-file SQLite database. This allows the server to
// boot without external infrastructure, which is handy for automated tests.

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
