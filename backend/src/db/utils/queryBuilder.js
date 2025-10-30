/**
 * SQL 查詢建構工具
 * 用於將抽象的 where 條件轉換為 SQL 查詢
 */

/**
 * 建構 WHERE 子句
 * @param {Object} where - 條件物件
 * @param {number} startIndex - 參數起始索引
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
      // IN 子句
      conditions.push(`${key} = ANY($${paramIndex})`);
      values.push(value);
      paramIndex++;
    } else if (typeof value === "object" && value.operator) {
      // 支援運算符：{operator: '>', value: 10}
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
 * 建構 ORDER BY 子句
 * @param {Object|Array} orderBy - 排序條件
 * @returns {string} - ORDER BY 子句
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
 * 建構 LIMIT/OFFSET 子句
 * @param {number} limit - 限制數量
 * @param {number} offset - 偏移量
 * @returns {string} - LIMIT/OFFSET 子句
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
 * 建構 INSERT 查詢
 * @param {string} table - 表格名稱
 * @param {Object} data - 要插入的資料
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
 * 建構 UPDATE 查詢
 * @param {string} table - 表格名稱
 * @param {Object} data - 要更新的資料
 * @param {Object} where - 更新條件
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
 * 建構 DELETE 查詢
 * @param {string} table - 表格名稱
 * @param {Object} where - 刪除條件
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
 * 建構 SELECT 查詢
 * @param {string} table - 表格名稱
 * @param {Object} options - 查詢選項
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
