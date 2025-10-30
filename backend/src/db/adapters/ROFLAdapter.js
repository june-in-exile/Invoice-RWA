import { IDatabase, ITransaction } from "../interfaces/IDatabase.js";

/**
 * ROFL Transaction 實作
 * ROFL 使用 key-value 儲存，交易實作較為簡化
 */
class ROFLTransaction extends ITransaction {
  constructor(roflClient) {
    super();
    this.roflClient = roflClient;
    this.operations = [];
    this.isActive = true;
  }

  async query(query, params = []) {
    // ROFL 不支援 SQL 查詢，此方法主要用於相容性
    throw new Error("ROFL does not support SQL queries. Use insert/update methods instead.");
  }

  async insert(table, data) {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }

    this.operations.push({
      type: "insert",
      table,
      data,
    });

    return data;
  }

  async update(table, data, where) {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }

    this.operations.push({
      type: "update",
      table,
      data,
      where,
    });

    return 1; // 假設更新一筆資料
  }

  async commit() {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }

    // 執行所有操作
    for (const op of this.operations) {
      if (op.type === "insert") {
        await this.roflClient.insert(op.table, op.data);
      } else if (op.type === "update") {
        await this.roflClient.update(op.table, op.data, op.where);
      }
    }

    this.operations = [];
    this.isActive = false;
  }

  async rollback() {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }

    this.operations = [];
    this.isActive = false;
  }

  async release() {
    this.isActive = false;
  }
}

/**
 * ROFL Storage Adapter
 *
 * ROFL 使用 key-value 儲存模式，與 PostgreSQL 的關聯式資料庫不同
 *
 * 儲存架構：
 * - 每個 table 對應一個 namespace
 * - 每筆記錄使用 unique key (例如：users:{wallet_address})
 * - 索引使用額外的 key-set (例如：users:index:carrier_number:{value})
 *
 * ROFL Storage API (基於文件)：
 * - storage.get(key): 取得資料
 * - storage.set(key, value): 儲存資料
 * - storage.delete(key): 刪除資料
 * - storage.has(key): 檢查是否存在
 */
export class ROFLAdapter extends IDatabase {
  constructor(roflClient) {
    super();
    this.rofl = roflClient; // ROFL SDK 客戶端
    this.connected = false;
  }

  async connect() {
    if (this.connected) {
      return;
    }

    // 初始化 ROFL 連接
    if (this.rofl && typeof this.rofl.connect === "function") {
      await this.rofl.connect();
    }

    this.connected = true;
  }

  async disconnect() {
    if (this.rofl && typeof this.rofl.disconnect === "function") {
      await this.rofl.disconnect();
    }
    this.connected = false;
  }

  /**
   * 建構 ROFL storage key
   * @param {string} table - 表格名稱
   * @param {string} id - 記錄 ID
   * @returns {string} - ROFL key
   */
  _buildKey(table, id) {
    return `rofl.${table}:${id}`;
  }

  /**
   * 建構索引 key
   * @param {string} table - 表格名稱
   * @param {string} field - 欄位名稱
   * @param {string} value - 欄位值
   * @returns {string} - 索引 key
   */
  _buildIndexKey(table, field, value) {
    return `rofl.${table}:index:${field}:${value}`;
  }

  /**
   * 建構列表 key（用於儲存所有記錄的 ID）
   * @param {string} table - 表格名稱
   * @returns {string} - 列表 key
   */
  _buildListKey(table) {
    return `rofl.${table}:list`;
  }

  /**
   * 從 where 條件中找出主鍵
   * @param {string} table - 表格名稱
   * @param {Object} where - 查詢條件
   * @returns {string|null} - 主鍵值
   */
  _extractPrimaryKey(table, where) {
    // 不同 table 的主鍵不同
    const primaryKeyMap = {
      users: "wallet_address",
      invoices: "invoice_number",
      pool_invoices: "id",
      token_holders: "id",
    };

    const primaryKey = primaryKeyMap[table];
    return where[primaryKey] || null;
  }

  async query(query, params = []) {
    // ROFL 不支援原生 SQL 查詢
    throw new Error(
      "ROFL adapter does not support raw SQL queries. Use findOne/findMany/insert/update/delete methods instead."
    );
  }

  async beginTransaction() {
    if (!this.connected) {
      await this.connect();
    }

    return new ROFLTransaction(this);
  }

  async findOne(table, where) {
    if (!this.connected) {
      await this.connect();
    }

    // 嘗試使用主鍵查詢
    const primaryKeyValue = this._extractPrimaryKey(table, where);
    if (primaryKeyValue) {
      const key = this._buildKey(table, primaryKeyValue);
      const data = await this.rofl.storage.get(key);
      return data ? JSON.parse(data) : null;
    }

    // 使用索引查詢（較慢）
    const results = await this.findMany(table, { where, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async findMany(table, options = {}) {
    if (!this.connected) {
      await this.connect();
    }

    const { where = {}, orderBy, limit, offset = 0 } = options;

    // 取得所有記錄 ID
    const listKey = this._buildListKey(table);
    const listData = await this.rofl.storage.get(listKey);
    const allIds = listData ? JSON.parse(listData) : [];

    // 根據 where 條件過濾
    let results = [];

    for (const id of allIds) {
      const key = this._buildKey(table, id);
      const data = await this.rofl.storage.get(key);

      if (data) {
        const record = JSON.parse(data);

        // 檢查是否符合 where 條件
        const matches = Object.entries(where).every(([field, value]) => {
          if (Array.isArray(value)) {
            return value.includes(record[field]);
          }
          return record[field] === value;
        });

        if (matches) {
          results.push(record);
        }
      }
    }

    // 排序
    if (orderBy) {
      if (typeof orderBy === "object" && !Array.isArray(orderBy)) {
        // {created_at: 'DESC'}
        const [field, direction] = Object.entries(orderBy)[0];
        results.sort((a, b) => {
          if (direction === "DESC") {
            return b[field] > a[field] ? 1 : -1;
          }
          return a[field] > b[field] ? 1 : -1;
        });
      }
    }

    // 分頁
    if (limit !== undefined) {
      results = results.slice(offset, offset + limit);
    } else if (offset > 0) {
      results = results.slice(offset);
    }

    return results;
  }

  async insert(table, data) {
    if (!this.connected) {
      await this.connect();
    }

    // 產生或取得主鍵
    const primaryKeyValue = this._extractPrimaryKey(table, data);
    if (!primaryKeyValue) {
      throw new Error(`Cannot determine primary key for table ${table}`);
    }

    // 儲存記錄
    const key = this._buildKey(table, primaryKeyValue);

    // 加入 created_at 時間戳記
    const recordData = {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
    };

    await this.rofl.storage.set(key, JSON.stringify(recordData));

    // 更新列表
    const listKey = this._buildListKey(table);
    const listData = await this.rofl.storage.get(listKey);
    const allIds = listData ? JSON.parse(listData) : [];

    if (!allIds.includes(primaryKeyValue)) {
      allIds.push(primaryKeyValue);
      await this.rofl.storage.set(listKey, JSON.stringify(allIds));
    }

    // 建立索引（例如 carrier_number）
    // 這裡簡化處理，實際應根據 table schema 建立必要索引
    if (table === "users" && data.carrier_number) {
      const indexKey = this._buildIndexKey(
        table,
        "carrier_number",
        data.carrier_number
      );
      await this.rofl.storage.set(indexKey, primaryKeyValue);
    }

    return recordData;
  }

  async update(table, data, where) {
    if (!this.connected) {
      await this.connect();
    }

    const primaryKeyValue = this._extractPrimaryKey(table, where);
    if (!primaryKeyValue) {
      throw new Error(`Cannot determine primary key for table ${table}`);
    }

    const key = this._buildKey(table, primaryKeyValue);
    const existingData = await this.rofl.storage.get(key);

    if (!existingData) {
      return 0; // 記錄不存在
    }

    const record = JSON.parse(existingData);
    const updatedRecord = {
      ...record,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await this.rofl.storage.set(key, JSON.stringify(updatedRecord));

    return 1; // 更新一筆記錄
  }

  async delete(table, where) {
    if (!this.connected) {
      await this.connect();
    }

    const primaryKeyValue = this._extractPrimaryKey(table, where);
    if (!primaryKeyValue) {
      throw new Error(`Cannot determine primary key for table ${table}`);
    }

    const key = this._buildKey(table, primaryKeyValue);
    const exists = await this.rofl.storage.has(key);

    if (!exists) {
      return 0;
    }

    await this.rofl.storage.delete(key);

    // 從列表中移除
    const listKey = this._buildListKey(table);
    const listData = await this.rofl.storage.get(listKey);
    const allIds = listData ? JSON.parse(listData) : [];

    const updatedIds = allIds.filter((id) => id !== primaryKeyValue);
    await this.rofl.storage.set(listKey, JSON.stringify(updatedIds));

    return 1;
  }
}

/**
 * Mock ROFL Client (用於開發測試)
 * 實際部署時應替換為真實的 ROFL SDK
 */
export class MockROFLClient {
  constructor() {
    this.storage = new Map();
  }

  async connect() {
    console.log("Mock ROFL client connected");
  }

  async disconnect() {
    console.log("Mock ROFL client disconnected");
  }
}

// 為 Mock client 加入 storage methods
MockROFLClient.prototype.storage = {
  _store: new Map(),

  async get(key) {
    return this._store.get(key) || null;
  },

  async set(key, value) {
    this._store.set(key, value);
  },

  async delete(key) {
    this._store.delete(key);
  },

  async has(key) {
    return this._store.has(key);
  },
};
