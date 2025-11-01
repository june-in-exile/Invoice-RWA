/**
 * Database Interface - Defines unified interface for all database operations
 * Supports different storage backends like PostgreSQL and ROFL
 */
export class IDatabase {
  /**
   * Connect to database
   */
  async connect() {
    throw new Error("Method 'connect()' must be implemented");
  }

  /**
   * Close database connection
   */
  async disconnect() {
    throw new Error("Method 'disconnect()' must be implemented");
  }

  /**
   * Execute query
   * @param {string} query - Query statement
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Query result {rows: [], rowCount: number}
   */
  async query(query, params = []) {
    throw new Error("Method 'query()' must be implemented");
  }

  /**
   * Begin transaction
   * @returns {Promise<ITransaction>} - Transaction object
   */
  async beginTransaction() {
    throw new Error("Method 'beginTransaction()' must be implemented");
  }

  /**
   * Get single record
   * @param {string} table - Table name
   * @param {Object} where - Query conditions
   * @returns {Promise<Object|null>} - Query result
   */
  async findOne(table, where) {
    throw new Error("Method 'findOne()' must be implemented");
  }

  /**
   * Get multiple records
   * @param {string} table - Table name
   * @param {Object} options - Query options {where, orderBy, limit, offset}
   * @returns {Promise<Array>} - Query results
   */
  async findMany(table, options = {}) {
    throw new Error("Method 'findMany()' must be implemented");
  }

  /**
   * Insert data
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} - Inserted data (including ID)
   */
  async insert(table, data) {
    throw new Error("Method 'insert()' must be implemented");
  }

  /**
   * Update data
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} where - Update conditions
   * @returns {Promise<number>} - Number of affected rows
   */
  async update(table, data, where) {
    throw new Error("Method 'update()' must be implemented");
  }

  /**
   * Delete data
   * @param {string} table - Table name
   * @param {Object} where - Delete conditions
   * @returns {Promise<number>} - Number of affected rows
   */
  async delete(table, where) {
    throw new Error("Method 'delete()' must be implemented");
  }
}

/**
 * Transaction Interface
 */
export class ITransaction {
  /**
   * Execute query
   * @param {string} query - Query statement
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Query result
   */
  async query(query, params = []) {
    throw new Error("Method 'query()' must be implemented");
  }

  /**
   * Insert data
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} - Inserted data
   */
  async insert(table, data) {
    throw new Error("Method 'insert()' must be implemented");
  }

  /**
   * Update data
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} where - Update conditions
   * @returns {Promise<number>} - Number of affected rows
   */
  async update(table, data, where) {
    throw new Error("Method 'update()' must be implemented");
  }

  /**
   * Commit transaction
   */
  async commit() {
    throw new Error("Method 'commit()' must be implemented");
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    throw new Error("Method 'rollback()' must be implemented");
  }

  /**
   * Release transaction resources
   */
  async release() {
    throw new Error("Method 'release()' must be implemented");
  }
}
