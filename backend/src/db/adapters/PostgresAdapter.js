import pg from "pg";
import { IDatabase, ITransaction } from "../interfaces/IDatabase.js";
import {
  buildSelectQuery,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
} from "../utils/queryBuilder.js";

const { Pool } = pg;

/**
 * PostgreSQL Transaction 實作
 */
class PostgresTransaction extends ITransaction {
  constructor(client) {
    super();
    this.client = client;
    this.isActive = true;
  }

  async query(query, params = []) {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }
    return await this.client.query(query, params);
  }

  async insert(table, data) {
    const { query, values } = buildInsertQuery(table, data);
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async update(table, data, where) {
    const { query, values } = buildUpdateQuery(table, data, where);
    const result = await this.query(query, values);
    return result.rowCount;
  }

  async commit() {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }
    await this.client.query("COMMIT");
    this.isActive = false;
  }

  async rollback() {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }
    await this.client.query("ROLLBACK");
    this.isActive = false;
  }

  async release() {
    this.client.release();
    this.isActive = false;
  }
}

/**
 * PostgreSQL Database Adapter
 */
export class PostgresAdapter extends IDatabase {
  constructor(config) {
    super();
    this.config = config;
    this.pool = null;
  }

  async connect() {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: this.config.max || 20,
      idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis || 2000,
    });

    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
      if (this.config.onError) {
        this.config.onError(err);
      }
    });
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async query(query, params = []) {
    if (!this.pool) {
      await this.connect();
    }
    return await this.pool.query(query, params);
  }

  async beginTransaction() {
    if (!this.pool) {
      await this.connect();
    }

    const client = await this.pool.connect();
    await client.query("BEGIN");

    return new PostgresTransaction(client);
  }

  async findOne(table, where) {
    const { query, values } = buildSelectQuery(table, { where, limit: 1 });
    const result = await this.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findMany(table, options = {}) {
    const { query, values } = buildSelectQuery(table, options);
    const result = await this.query(query, values);
    return result.rows;
  }

  async insert(table, data) {
    const { query, values } = buildInsertQuery(table, data);
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async update(table, data, where) {
    const { query, values } = buildUpdateQuery(table, data, where);
    const result = await this.query(query, values);
    return result.rowCount;
  }

  async delete(table, where) {
    const { query, values } = buildDeleteQuery(table, where);
    const result = await this.query(query, values);
    return result.rowCount;
  }

  /**
   * 取得連接池（用於原有的 pool.connect() 模式）
   */
  getPool() {
    return this.pool;
  }
}
