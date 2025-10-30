import sqlite3 from "sqlite3";
import { IDatabase, ITransaction } from "../interfaces/IDatabase.js";
import {
  buildSelectQuery,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
} from "../utils/queryBuilder.js";

/**
 * Convert PostgreSQL-style parameterized query ($1, $2) to SQLite-style (?, ?)
 * @param {string} query - PostgreSQL-style query
 * @returns {string} - SQLite-style query
 */
function convertQueryToSQLite(query) {
  // Replace $1, $2, $3... with ?
  return query.replace(/\$\d+/g, "?");
}

/**
 * SQLite Transaction Implementation
 */
class SQLiteTransaction extends ITransaction {
  constructor(db) {
    super();
    this.db = db;
    this.isActive = true;
  }

  async query(query, params = []) {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }

    const sqliteQuery = convertQueryToSQLite(query);

    return new Promise((resolve, reject) => {
      this.db.all(sqliteQuery, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve({ rows, rowCount: rows.length });
        }
      });
    });
  }

  async insert(table, data) {
    const { query, values } = buildInsertQuery(table, data);
    // SQLite doesn't support RETURNING *, so we need to handle it differently
    const insertQuery = convertQueryToSQLite(query.replace(" RETURNING *", ""));

    const db = this.db; // Capture db reference for nested callback

    return new Promise((resolve, reject) => {
      db.run(insertQuery, values, function (err) {
        if (err) {
          reject(err);
        } else {
          const lastID = this.lastID; // Capture lastID from run context
          // Fetch the inserted row using lastID
          const selectQuery = `SELECT * FROM ${table} WHERE rowid = ?`;
          db.get(selectQuery, [lastID], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        }
      });
    });
  }

  async update(table, data, where) {
    const { query, values } = buildUpdateQuery(table, data, where);
    // Remove RETURNING * for SQLite
    const updateQuery = convertQueryToSQLite(query.replace(" RETURNING *", ""));

    return new Promise((resolve, reject) => {
      this.db.run(updateQuery, values, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes); // Number of rows affected
        }
      });
    });
  }

  async commit() {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }

    return new Promise((resolve, reject) => {
      this.db.run("COMMIT", (err) => {
        if (err) {
          reject(err);
        } else {
          this.isActive = false;
          resolve();
        }
      });
    });
  }

  async rollback() {
    if (!this.isActive) {
      throw new Error("Transaction is not active");
    }

    return new Promise((resolve, reject) => {
      this.db.run("ROLLBACK", (err) => {
        if (err) {
          reject(err);
        } else {
          this.isActive = false;
          resolve();
        }
      });
    });
  }

  async release() {
    this.isActive = false;
  }
}

/**
 * SQLite Database Adapter
 */
export class SQLiteAdapter extends IDatabase {
  constructor(config) {
    super();
    this.config = config;
    this.db = null;
  }

  async connect() {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const dbPath = this.config.path || this.config.database;

      this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to SQLite database: ${err.message}`));
        } else {
          // Enable foreign keys
          this.db.run("PRAGMA foreign_keys = ON", (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });

      this.db.on("error", (err) => {
        console.error("SQLite error:", err);
        if (this.config.onError) {
          this.config.onError(err);
        }
      });
    });
  }

  async disconnect() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            resolve();
          }
        });
      });
    }
  }

  async query(query, params = []) {
    if (!this.db) {
      await this.connect();
    }

    const sqliteQuery = convertQueryToSQLite(query);

    return new Promise((resolve, reject) => {
      this.db.all(sqliteQuery, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve({ rows, rowCount: rows.length });
        }
      });
    });
  }

  async beginTransaction() {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.db.run("BEGIN TRANSACTION", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(new SQLiteTransaction(this.db));
        }
      });
    });
  }

  async findOne(table, where) {
    const { query, values } = buildSelectQuery(table, { where, limit: 1 });
    const sqliteQuery = convertQueryToSQLite(query);

    return new Promise((resolve, reject) => {
      this.db.get(sqliteQuery, values, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async findMany(table, options = {}) {
    const { query, values } = buildSelectQuery(table, options);
    const result = await this.query(query, values);
    return result.rows;
  }

  async insert(table, data) {
    if (!this.db) {
      await this.connect();
    }

    const { query, values } = buildInsertQuery(table, data);
    // SQLite doesn't support RETURNING *, so we need to handle it differently
    const insertQuery = convertQueryToSQLite(query.replace(" RETURNING *", ""));

    const db = this.db; // Capture db reference for use in nested callbacks

    return new Promise((resolve, reject) => {
      db.run(insertQuery, values, function (err) {
        if (err) {
          reject(err);
        } else {
          // Fetch the inserted row using lastID
          // For tables with custom primary keys, we need to find by the inserted data
          const primaryKeys = Object.keys(data).filter(key =>
            key === 'id' || key.endsWith('_id') || key.endsWith('_number') || key.endsWith('_address')
          );

          if (primaryKeys.length > 0) {
            // Use the primary key from the inserted data
            const whereClause = primaryKeys.map(key => `${key} = ?`).join(' AND ');
            const whereValues = primaryKeys.map(key => data[key]);
            const selectQuery = `SELECT * FROM ${table} WHERE ${whereClause}`;

            db.get(selectQuery, whereValues, (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          } else {
            // Fallback to rowid
            const selectQuery = `SELECT * FROM ${table} WHERE rowid = ?`;
            db.get(selectQuery, [this.lastID], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          }
        }
      });
    });
  }

  async update(table, data, where) {
    const { query, values } = buildUpdateQuery(table, data, where);
    // Remove RETURNING * for SQLite
    const updateQuery = convertQueryToSQLite(query.replace(" RETURNING *", ""));

    return new Promise((resolve, reject) => {
      this.db.run(updateQuery, values, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes); // Number of rows affected
        }
      });
    });
  }

  async delete(table, where) {
    const { query, values } = buildDeleteQuery(table, where);
    const deleteQuery = convertQueryToSQLite(query);

    return new Promise((resolve, reject) => {
      this.db.run(deleteQuery, values, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes); // Number of rows affected
        }
      });
    });
  }

  /**
   * Get the raw database connection (for advanced usage)
   */
  getConnection() {
    return this.db;
  }
}
