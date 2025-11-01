import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";
import { SQLiteAdapter } from "./adapters/SQLiteAdapter.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    logger.info("Starting database initialization...");

    // Check database type
    const dbType = process.env.DB_TYPE || "sqlite";

    if (dbType !== "sqlite") {
      logger.error(
        `Unsupported database type: ${dbType}. Only 'sqlite' is supported for ROFL deployment.`
      );
      process.exit(1);
    }

    // Verify that db is a SQLite adapter
    if (!(db instanceof SQLiteAdapter)) {
      logger.error(
        "Database is not a SQLite adapter. Schema initialization requires SQLite."
      );
      process.exit(1);
    }

    // Connect to database
    await db.connect();

    // Read SQLite schema file
    const schemaPath = path.join(__dirname, "schema.sqlite.sql");

    if (!fs.existsSync(schemaPath)) {
      logger.error(`Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, "utf8");

    // Split schema into individual statements (SQLite executes one statement at a time)
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      try {
        await db.query(statement);
      } catch (error) {
        // Ignore "table already exists" errors
        if (!error.message.includes("already exists")) {
          throw error;
        }
      }
    }

    logger.info("Database initialized successfully");
    logger.info("Tables created from schema.sqlite.sql");

    await db.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error("Failed to initialize database", { error: error.message });
    console.error(error);
    process.exit(1);
  }
}

initDatabase();
