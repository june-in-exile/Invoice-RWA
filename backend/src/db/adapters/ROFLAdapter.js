import { IDatabase, ITransaction } from "../interfaces/IDatabase.js";

/**
 * ROFL Transaction Implementation
 * ROFL uses key-value storage, so the transaction implementation is simplified
 */
class ROFLTransaction extends ITransaction {
  constructor(roflClient) {
    super();
    this.roflClient = roflClient;
    this.operations = [];
    this.isActive = true;
  }

  async query(query, params = []) {
    // ROFL does not support SQL queries, this method is mainly for compatibility
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

    return 1; // Assume one record is updated
  }

  async commit() {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }

    // Execute all operations
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
 * ROFL uses key-value storage mode, which is different from PostgreSQL's relational database
 *
 * Storage architecture:
 * - Each table corresponds to a namespace
 * - Each record uses a unique key (e.g., users:{wallet_address})
 * - Indexes use additional key-sets (e.g., users:index:carrier_number:{value})
 *
 * ROFL Storage API (based on documentation):
 * - storage.get(key): Get data
 * - storage.set(key, value): Store data
 * - storage.delete(key): Delete data
 * - storage.has(key): Check if exists
 */
export class ROFLAdapter extends IDatabase {
  constructor(roflClient) {
    super();
    this.rofl = roflClient; // ROFL SDK client
    this.connected = false;
  }

  async connect() {
    if (this.connected) {
      return;
    }

    // Initialize ROFL connection
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
   * Build ROFL storage key
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @returns {string} - ROFL key
   */
  _buildKey(table, id) {
    return `rofl.${table}:${id}`;
  }

  /**
   * Build index key
   * @param {string} table - Table name
   * @param {string} field - Field name
   * @param {string} value - Field value
   * @returns {string} - Index key
   */
  _buildIndexKey(table, field, value) {
    return `rofl.${table}:index:${field}:${value}`;
  }

  /**
   * Build list key (for storing all record IDs)
   * @param {string} table - Table name
   * @returns {string} - List key
   */
  _buildListKey(table) {
    return `rofl.${table}:list`;
  }

  /**
   * Extract primary key from where conditions
   * @param {string} table - Table name
   * @param {Object} where - Query conditions
   * @returns {string|null} - Primary key value
   */
  _extractPrimaryKey(table, where) {
    // Different tables have different primary keys
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
    // ROFL does not support raw SQL queries
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

    // Try to use primary key query
    const primaryKeyValue = this._extractPrimaryKey(table, where);
    if (primaryKeyValue) {
      const key = this._buildKey(table, primaryKeyValue);
      const data = await this.rofl.storage.get(key);
      return data ? JSON.parse(data) : null;
    }

    // Use index query (slower)
    const results = await this.findMany(table, { where, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async findMany(table, options = {}) {
    if (!this.connected) {
      await this.connect();
    }

    const { where = {}, orderBy, limit, offset = 0 } = options;

    // Get all record IDs
    const listKey = this._buildListKey(table);
    const listData = await this.rofl.storage.get(listKey);
    const allIds = listData ? JSON.parse(listData) : [];

    // Filter based on where conditions
    let results = [];

    for (const id of allIds) {
      const key = this._buildKey(table, id);
      const data = await this.rofl.storage.get(key);

      if (data) {
        const record = JSON.parse(data);

        // Check if matches where conditions
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

    // Sort
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

    // Pagination
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

    // Generate or get primary key
    const primaryKeyValue = this._extractPrimaryKey(table, data);
    if (!primaryKeyValue) {
      throw new Error(`Cannot determine primary key for table ${table}`);
    }

    // Store record
    const key = this._buildKey(table, primaryKeyValue);

    // Add created_at timestamp
    const recordData = {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
    };

    await this.rofl.storage.set(key, JSON.stringify(recordData));

    // Update list
    const listKey = this._buildListKey(table);
    const listData = await this.rofl.storage.get(listKey);
    const allIds = listData ? JSON.parse(listData) : [];

    if (!allIds.includes(primaryKeyValue)) {
      allIds.push(primaryKeyValue);
      await this.rofl.storage.set(listKey, JSON.stringify(allIds));
    }

    // Create index (e.g., carrier_number)
    // Simplified handling here, actual implementation should create necessary indexes based on table schema
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
      return 0; // Record does not exist
    }

    const record = JSON.parse(existingData);
    const updatedRecord = {
      ...record,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await this.rofl.storage.set(key, JSON.stringify(updatedRecord));

    return 1; // Updated one record
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

    // Remove from list
    const listKey = this._buildListKey(table);
    const listData = await this.rofl.storage.get(listKey);
    const allIds = listData ? JSON.parse(listData) : [];

    const updatedIds = allIds.filter((id) => id !== primaryKeyValue);
    await this.rofl.storage.set(listKey, JSON.stringify(updatedIds));

    return 1;
  }
}

/**
 * Mock ROFL Client (for development testing)
 * Should be replaced with the actual ROFL SDK in production deployment
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

// Add storage methods to Mock client
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
