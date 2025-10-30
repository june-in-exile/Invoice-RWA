import dotenv from "dotenv";
import { PostgresAdapter } from "./adapters/PostgresAdapter.js";
import { ROFLAdapter, MockROFLClient } from "./adapters/ROFLAdapter.js";

dotenv.config();

/**
 * Database Factory
 * Creates a corresponding database adapter based on the configuration
 */
export class DatabaseFactory {
  /**
   * Creates a database adapter
   * @param {string} type - The database type ('postgres' | 'rofl')
   * @param {Object} config - The database configuration
   * @returns {IDatabase} - An instance of the database adapter
   */
  static createDatabase(type = null, config = null) {
    const dbType = type || process.env.DB_TYPE || "postgres";
    const dbConfig = config || DatabaseFactory.getDefaultConfig(dbType);

    switch (dbType.toLowerCase()) {
      case "postgres":
      case "postgresql":
        return new PostgresAdapter(dbConfig);

      case "rofl":
        // If a ROFL client is provided, use it; otherwise, use the Mock client
        const roflClient = dbConfig.client || new MockROFLClient();
        return new ROFLAdapter(roflClient);

      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  /**
   * Gets the default configuration
   * @param {string} type - The database type
   * @returns {Object} - The configuration object
   */
  static getDefaultConfig(type) {
    switch (type.toLowerCase()) {
      case "postgres":
      case "postgresql":
        return {
          host: process.env.DB_HOST || "localhost",
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || "invoice_rwa",
          user: process.env.DB_USER || "postgres",
          password: process.env.DB_PASSWORD || "",
          max: parseInt(process.env.DB_POOL_MAX) || 20,
          idleTimeoutMillis:
            parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
          connectionTimeoutMillis:
            parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
          onError: (err) => {
            console.error("Database error:", err);
            process.exit(-1);
          },
        };

      case "rofl":
        return {
          // ROFL configuration (adjust according to the actual SDK needs)
          endpoint: process.env.ROFL_ENDPOINT,
          nodeId: process.env.ROFL_NODE_ID,
          // A real ROFL client should be provided in actual deployment
          client: null,
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
