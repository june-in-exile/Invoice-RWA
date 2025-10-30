/**
 * Database Abstraction Layer
 *
 * This module provides a unified database interface, supporting:
 * - PostgreSQL (default)
 * - ROFL (Oasis Runtime Off-Chain Logic)
 *
 * Use the DB_TYPE environment variable to switch database types:
 * - DB_TYPE=postgres (default)
 * - DB_TYPE=rofl
 */

import { getDatabase, DatabaseFactory } from "./DatabaseFactory.js";

// Get database instance (based on DB_TYPE environment variable)
const db = getDatabase();

// Ensure the connection is initialized
await db.connect();

// Export the main database instance
export default db;

// Export the factory method for cases where multiple database connections are needed
export { DatabaseFactory, getDatabase };