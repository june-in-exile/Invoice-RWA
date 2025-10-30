import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";
import { PostgresAdapter } from "./adapters/PostgresAdapter.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    logger.info("Starting database initialization...");

    // Check database type
    const dbType = process.env.DB_TYPE || "postgres";

    if (dbType !== "postgres" && dbType !== "postgresql") {
      logger.warn(
        `Database initialization is only supported for PostgreSQL. Current DB_TYPE: ${dbType}`
      );
      logger.info(
        "ROFL storage does not require SQL schema initialization."
      );
      process.exit(0);
    }

    // Verify that db is a PostgreSQL adapter
    if (!(db instanceof PostgresAdapter)) {
      logger.error(
        "Database is not a PostgreSQL adapter. Schema initialization requires PostgreSQL."
      );
      process.exit(1);
    }

    // Read schema file
    const schemaPath = path.join(__dirname, "schema.sql");

    if (!fs.existsSync(schemaPath)) {
      logger.error(`Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, "utf8");

    // Execute schema using raw query (PostgreSQL specific)
    await db.query(schema);

    logger.info("Database initialized successfully");
    logger.info("Tables created from schema.sql");
    process.exit(0);
  } catch (error) {
    logger.error("Failed to initialize database", { error: error.message });
    console.error(error);
    process.exit(1);
  }
}

initDatabase();
