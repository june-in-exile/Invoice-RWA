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

// 取得資料庫實例（根據 DB_TYPE 環境變數）
const db = getDatabase();

// 確保連接已初始化
await db.connect();

// 匯出主要的資料庫實例
export default db;

// 匯出工廠方法，供需要建立多個資料庫連接的情況使用
export { DatabaseFactory, getDatabase };
