import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    logger.info("Starting database initialization...");

    // Read schema file
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Execute schema
    await db.query(schema);

    logger.info("Database initialized successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Failed to initialize database", { error: error.message });
    console.error(error);
    process.exit(1);
  }
}

initDatabase();
