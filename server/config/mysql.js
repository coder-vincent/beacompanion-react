import { Sequelize } from "sequelize";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Database selection logic
// ---------------------------------------------------------------------------
// 1. If DB_DIALECT = sqlite  → always use local SQLite (for tests / CI)
// 2. Else require DB_HOST    → connect to remote MySQL
// 3. If neither supplied     → throw early so the issue is obvious

const explicitlySQLite = process.env.DB_DIALECT === "sqlite";

if (explicitlySQLite) {
  console.error("[DB] Using forced SQLite mode via DB_DIALECT=sqlite");
}

if (!explicitlySQLite && !process.env.DB_HOST) {
  throw new Error(
    "DB_HOST environment variable missing – set it to your MySQL host or set DB_DIALECT=sqlite to run with a local SQLite file."
  );
}

const useSQLite = explicitlySQLite;

const sequelize = useSQLite
  ? new Sequelize({ dialect: "sqlite", storage: "dev.db.sqlite" })
  : new Sequelize(
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

// Basic diagnostic output (will show even if console.log is patched)
if (!useSQLite) {
  console.error(
    "[DB] Connecting to MySQL:",
    process.env.DB_HOST,
    process.env.DB_PORT || 3306,
    process.env.DB_DATABASE,
    process.env.DB_USER,
    `SSL=${process.env.DB_SSL}`
  );
}

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
