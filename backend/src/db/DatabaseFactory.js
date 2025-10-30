import dotenv from "dotenv";
import { PostgresAdapter } from "./adapters/PostgresAdapter.js";
import { ROFLAdapter, MockROFLClient } from "./adapters/ROFLAdapter.js";

dotenv.config();

/**
 * Database Factory
 * 根據配置建立對應的資料庫 adapter
 */
export class DatabaseFactory {
  /**
   * 建立資料庫 adapter
   * @param {string} type - 資料庫類型 ('postgres' | 'rofl')
   * @param {Object} config - 資料庫配置
   * @returns {IDatabase} - 資料庫 adapter 實例
   */
  static createDatabase(type = null, config = null) {
    const dbType = type || process.env.DB_TYPE || "postgres";
    const dbConfig = config || DatabaseFactory.getDefaultConfig(dbType);

    switch (dbType.toLowerCase()) {
      case "postgres":
      case "postgresql":
        return new PostgresAdapter(dbConfig);

      case "rofl":
        // 如果有提供 ROFL client，使用它；否則使用 Mock client
        const roflClient = dbConfig.client || new MockROFLClient();
        return new ROFLAdapter(roflClient);

      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  /**
   * 取得預設配置
   * @param {string} type - 資料庫類型
   * @returns {Object} - 配置物件
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
          // ROFL 配置（根據實際 SDK 需求調整）
          endpoint: process.env.ROFL_ENDPOINT,
          nodeId: process.env.ROFL_NODE_ID,
          // 實際部署時應提供真實的 ROFL client
          client: null,
        };

      default:
        return {};
    }
  }
}

/**
 * 建立並匯出預設的資料庫實例
 */
let defaultDatabase = null;

export function getDatabase() {
  if (!defaultDatabase) {
    defaultDatabase = DatabaseFactory.createDatabase();
  }
  return defaultDatabase;
}

export default getDatabase();
