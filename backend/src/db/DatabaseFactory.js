import dotenv from "dotenv";
import { SQLiteAdapter } from "./adapters/SQLiteAdapter.js";

dotenv.config();

/**
 * Database Factory
 * Creates SQLite database adapter for ROFL deployment
 */
export class DatabaseFactory {
  /**
   * Creates a database adapter
   * @param {string} type - The database type ('sqlite')
   * @param {Object} config - The database configuration
   * @returns {IDatabase} - An instance of the database adapter
   */
  static createDatabase(type = null, config = null) {
    const dbType = type || process.env.DB_TYPE || "sqlite";
    const dbConfig = config || DatabaseFactory.getDefaultConfig(dbType);

    switch (dbType.toLowerCase()) {
      case "sqlite":
        return new SQLiteAdapter(dbConfig);

      default:
        throw new Error(`Unsupported database type: ${dbType}. Only 'sqlite' is supported for ROFL deployment.`);
    }
  }

  /**
   * Gets the default configuration
   * @param {string} type - The database type
   * @returns {Object} - The configuration object
   */
  static getDefaultConfig(type) {
    switch (type.toLowerCase()) {
      case "sqlite":
        return {
          path: process.env.DB_PATH || "/rofl/storage/invoice_rwa.db",
          database: process.env.DB_NAME || "invoice_rwa",
          onError: (err) => {
            console.error("Database error:", err);
            process.exit(-1);
          },
        };

      default:
        return {};
    }
  }
}

/**
 * Creates and exports a default database instance
 */
let defaultDatabase = null;

export function getDatabase() {
  if (!defaultDatabase) {
    defaultDatabase = DatabaseFactory.createDatabase();
  }
  return defaultDatabase;
}

export default getDatabase();
