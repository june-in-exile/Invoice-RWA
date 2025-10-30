/**
 * 資料庫介面 - 定義所有資料庫操作的統一介面
 * 支援 PostgreSQL 和 ROFL 等不同的儲存後端
 */
export class IDatabase {
  /**
   * 連接資料庫
   */
  async connect() {
    throw new Error("Method 'connect()' must be implemented");
  }

  /**
   * 關閉資料庫連接
   */
  async disconnect() {
    throw new Error("Method 'disconnect()' must be implemented");
  }

  /**
   * 執行查詢
   * @param {string} query - 查詢語句
   * @param {Array} params - 查詢參數
   * @returns {Promise<Object>} - 查詢結果 {rows: [], rowCount: number}
   */
  async query(query, params = []) {
    throw new Error("Method 'query()' must be implemented");
  }

  /**
   * 開始交易
   * @returns {Promise<ITransaction>} - 交易物件
   */
  async beginTransaction() {
    throw new Error("Method 'beginTransaction()' must be implemented");
  }

  /**
   * 取得單筆資料
   * @param {string} table - 表格名稱
   * @param {Object} where - 查詢條件
   * @returns {Promise<Object|null>} - 查詢結果
   */
  async findOne(table, where) {
    throw new Error("Method 'findOne()' must be implemented");
  }

  /**
   * 取得多筆資料
   * @param {string} table - 表格名稱
   * @param {Object} options - 查詢選項 {where, orderBy, limit, offset}
   * @returns {Promise<Array>} - 查詢結果
   */
  async findMany(table, options = {}) {
    throw new Error("Method 'findMany()' must be implemented");
  }

  /**
   * 插入資料
   * @param {string} table - 表格名稱
   * @param {Object} data - 要插入的資料
   * @returns {Promise<Object>} - 插入的資料（包含 ID）
   */
  async insert(table, data) {
    throw new Error("Method 'insert()' must be implemented");
  }

  /**
   * 更新資料
   * @param {string} table - 表格名稱
   * @param {Object} data - 要更新的資料
   * @param {Object} where - 更新條件
   * @returns {Promise<number>} - 影響的行數
   */
  async update(table, data, where) {
    throw new Error("Method 'update()' must be implemented");
  }

  /**
   * 刪除資料
   * @param {string} table - 表格名稱
   * @param {Object} where - 刪除條件
   * @returns {Promise<number>} - 影響的行數
   */
  async delete(table, where) {
    throw new Error("Method 'delete()' must be implemented");
  }
}

/**
 * 交易介面
 */
export class ITransaction {
  /**
   * 執行查詢
   * @param {string} query - 查詢語句
   * @param {Array} params - 查詢參數
   * @returns {Promise<Object>} - 查詢結果
   */
  async query(query, params = []) {
    throw new Error("Method 'query()' must be implemented");
  }

  /**
   * 插入資料
   * @param {string} table - 表格名稱
   * @param {Object} data - 要插入的資料
   * @returns {Promise<Object>} - 插入的資料
   */
  async insert(table, data) {
    throw new Error("Method 'insert()' must be implemented");
  }

  /**
   * 更新資料
   * @param {string} table - 表格名稱
   * @param {Object} data - 要更新的資料
   * @param {Object} where - 更新條件
   * @returns {Promise<number>} - 影響的行數
   */
  async update(table, data, where) {
    throw new Error("Method 'update()' must be implemented");
  }

  /**
   * 提交交易
   */
  async commit() {
    throw new Error("Method 'commit()' must be implemented");
  }

  /**
   * 回滾交易
   */
  async rollback() {
    throw new Error("Method 'rollback()' must be implemented");
  }

  /**
   * 釋放交易資源
   */
  async release() {
    throw new Error("Method 'release()' must be implemented");
  }
}
