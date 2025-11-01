/**
 * SQL Query Builder Utility
 * Used to convert abstract where conditions to SQL queries
 */

/**
 * Build WHERE clause
 * @param {Object} where - Condition object
 * @param {number} startIndex - Parameter starting index
 * @returns {Object} - {clause: string, values: Array, nextIndex: number}
 */
export function buildWhereClause(where, startIndex = 1) {
  if (!where || Object.keys(where).length === 0) {
    return { clause: "", values: [], nextIndex: startIndex };
  }

  const conditions = [];
  const values = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(where)) {
    if (value === null) {
      conditions.push(`${key} IS NULL`);
    } else if (value === undefined) {
      continue;
    } else if (Array.isArray(value)) {
      // IN clause
      conditions.push(`${key} = ANY($${paramIndex})`);
      values.push(value);
      paramIndex++;
    } else if (typeof value === "object" && value.operator) {
      // Support operators: {operator: '>', value: 10}
      conditions.push(`${key} ${value.operator} $${paramIndex}`);
      values.push(value.value);
      paramIndex++;
    } else {
      conditions.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, values, nextIndex: paramIndex };
}

/**
 * Build ORDER BY clause
 * @param {Object|Array} orderBy - Sort conditions
 * @returns {string} - ORDER BY clause
 */
export function buildOrderByClause(orderBy) {
  if (!orderBy) {
    return "";
  }

  if (Array.isArray(orderBy)) {
    // [{column: 'created_at', direction: 'DESC'}]
    const orders = orderBy.map(
      (o) => `${o.column} ${o.direction || "ASC"}`
    );
    return `ORDER BY ${orders.join(", ")}`;
  } else if (typeof orderBy === "object") {
    // {created_at: 'DESC', id: 'ASC'}
    const orders = Object.entries(orderBy).map(
      ([column, direction]) => `${column} ${direction}`
    );
    return `ORDER BY ${orders.join(", ")}`;
  } else if (typeof orderBy === "string") {
    // 'created_at DESC'
    return `ORDER BY ${orderBy}`;
  }

  return "";
}

/**
 * Build LIMIT/OFFSET clause
 * @param {number} limit - Limit count
 * @param {number} offset - Offset amount
 * @returns {string} - LIMIT/OFFSET clause
 */
export function buildLimitOffsetClause(limit, offset) {
  const clauses = [];

  if (limit !== undefined && limit !== null) {
    clauses.push(`LIMIT ${limit}`);
  }

  if (offset !== undefined && offset !== null && offset > 0) {
    clauses.push(`OFFSET ${offset}`);
  }

  return clauses.join(" ");
}

/**
 * Build INSERT query
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 * @returns {Object} - {query: string, values: Array}
 */
export function buildInsertQuery(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);

  const columns = keys.join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

  const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;

  return { query, values };
}

/**
 * Build UPDATE query
 * @param {string} table - Table name
 * @param {Object} data - Data to update
 * @param {Object} where - Update conditions
 * @returns {Object} - {query: string, values: Array}
 */
export function buildUpdateQuery(table, data, where) {
  const updateKeys = Object.keys(data);
  const updateValues = Object.values(data);

  const setClause = updateKeys
    .map((key, i) => `${key} = $${i + 1}`)
    .join(", ");

  const whereResult = buildWhereClause(where, updateKeys.length + 1);

  const query = `UPDATE ${table} SET ${setClause} ${whereResult.clause} RETURNING *`;
  const values = [...updateValues, ...whereResult.values];

  return { query, values };
}

/**
 * Build DELETE query
 * @param {string} table - Table name
 * @param {Object} where - Delete conditions
 * @returns {Object} - {query: string, values: Array}
 */
export function buildDeleteQuery(table, where) {
  const whereResult = buildWhereClause(where);

  if (!whereResult.clause) {
    throw new Error("DELETE query must have WHERE clause for safety");
  }

  const query = `DELETE FROM ${table} ${whereResult.clause}`;

  return { query, values: whereResult.values };
}

/**
 * Build SELECT query
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Object} - {query: string, values: Array}
 */
export function buildSelectQuery(table, options = {}) {
  const { where, orderBy, limit, offset, select = "*" } = options;

  const whereResult = buildWhereClause(where);
  const orderByClause = buildOrderByClause(orderBy);
  const limitOffsetClause = buildLimitOffsetClause(limit, offset);

  const selectColumns = Array.isArray(select) ? select.join(", ") : select;

  const query = `SELECT ${selectColumns} FROM ${table} ${whereResult.clause} ${orderByClause} ${limitOffsetClause}`.trim();

  return { query, values: whereResult.values };
}
