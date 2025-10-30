/**
 * 資料庫抽象層
 *
 * 此模組提供統一的資料庫介面，支援：
 * - PostgreSQL (預設)
 * - ROFL (Oasis Runtime Off-Chain Logic)
 *
 * 使用 DB_TYPE 環境變數切換資料庫類型：
 * - DB_TYPE=postgres (預設)
 * - DB_TYPE=rofl
 */

import { getDatabase, DatabaseFactory } from "./DatabaseFactory.js";
import { PostgresAdapter } from "./adapters/PostgresAdapter.js";

// 取得資料庫實例（根據 DB_TYPE 環境變數）
const db = getDatabase();

// 確保連接已初始化
await db.connect();

/**
 * 為了向後相容，提供與原本 pool 相同的介面
 * 現有程式碼可以繼續使用 db.query() 而不需修改
 */

// 匯出主要的資料庫實例
export default db;

// 同時匯出工廠方法，供需要建立多個資料庫連接的情況使用
export { DatabaseFactory, getDatabase };

/**
 * 向後相容：如果使用 PostgreSQL，也匯出原始的 pool
 * 供需要直接存取 pg pool 的程式碼使用
 */
export const pool = db instanceof PostgresAdapter ? db.getPool() : null;
