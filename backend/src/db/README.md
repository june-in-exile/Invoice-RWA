# Database Abstraction Layer

This database abstraction layer provides a unified interface to access different storage backends, including PostgreSQL and Oasis ROFL (Runtime Off-Chain Logic).

## Architecture

```
src/db/
├── interfaces/
│   └── IDatabase.js          # Database interface definition
├── adapters/
│   ├── PostgresAdapter.js    # PostgreSQL implementation
│   └── ROFLAdapter.js         # ROFL storage implementation
├── utils/
│   └── queryBuilder.js       # SQL query builder utility
├── DatabaseFactory.js        # Database factory
└── db.js                     # Main export file
```

## Features

- 🔄 **Multi-backend Support**: Supports PostgreSQL and ROFL storage
- 🎯 **Unified Interface**: All database operations use the same API
- 💾 **Transaction Support**: Full transaction management (begin, commit, rollback)
- 🔌 **Easy to Extend**: Easily add other database types
- ⚡ **Type Safety**: Clear interface definitions and error handling

## Quick Start

### 1. Set Environment Variables

Set the database type in the `.env` file:

```bash
# Use PostgreSQL (default)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoice_rwa
DB_USER=postgres
DB_PASSWORD=yourpassword

# Or use ROFL
DB_TYPE=rofl
ROFL_ENDPOINT=your-rofl-endpoint
ROFL_NODE_ID=your-node-id
```

### 2. Basic Usage

```javascript
import db from './db/db.js';

// Find a single record
const user = await db.findOne('users', {
  wallet_address: '0x123...'
});

// Find multiple records
const invoices = await db.findMany('invoices', {
  where: { lottery_day: '2025-03-25', drawn: false },
  orderBy: { created_at: 'DESC' },
  limit: 10
});

// Insert data
const newUser = await db.insert('users', {
  wallet_address: '0x123...',
  carrier_number: 'AB12345678',
  pool_id: 1,
  donation_percent: 20
});

// Update data
const rowsAffected = await db.update(
  'invoices',
  { drawn: true, prize_amount: 1000 },
  { invoice_number: 'AB-12345678' }
);

// Delete data
const deleted = await db.delete('users', {
  wallet_address: '0x123...'
});
```

### 3. Using Transactions

```javascript
const transaction = await db.beginTransaction();

try {
  // Insert invoice
  await transaction.insert('invoices', {
    invoice_number: 'AB-12345678',
    amount: 1000,
    // ... other fields
  });

  // Update user statistics
  await transaction.update(
    'users',
    { total_invoices: { operator: '+', value: 1 } },
    { wallet_address: '0x123...' }
  );

  // Commit transaction
  await transaction.commit();
} catch (error) {
  // Rollback on error
  await transaction.rollback();
  throw error;
} finally {
  // Release resources
  await transaction.release();
}
```

## API Reference

### IDatabase Interface

#### `connect()`
Connect to the database

```javascript
await db.connect();
```

#### `disconnect()`
Close the database connection

```javascript
await db.disconnect();
```

#### `findOne(table, where)`
Find a single record

Parameters:
- `table`: Table name
- `where`: Query conditions object

```javascript
const user = await db.findOne('users', {
  wallet_address: '0x123...'
});
```

#### `findMany(table, options)`
Find multiple records

Parameters:
- `table`: Table name
- `options`: Query options
  - `where`: Query conditions
  - `orderBy`: Order by conditions
  - `limit`: Limit number of records
  - `offset`: Offset
  - `select`: Select fields (default `*`)

```javascript
const invoices = await db.findMany('invoices', {
  where: {
    lottery_day: '2025-03-25',
    drawn: false
  },
  orderBy: { created_at: 'DESC' },
  limit: 10,
  offset: 0,
  select: ['invoice_number', 'amount', 'wallet_address']
});
```

#### `insert(table, data)`
Insert data

```javascript
const invoice = await db.insert('invoices', {
  invoice_number: 'AB-12345678',
  amount: 1000,
  lottery_day: '2025-03-25'
});
```

#### `update(table, data, where)`
Update data

```javascript
const rowsAffected = await db.update(
  'invoices',
  { drawn: true },
  { invoice_number: 'AB-12345678' }
);
```

#### `delete(table, where)`
Delete data

```javascript
const deleted = await db.delete('invoices', {
  invoice_number: 'AB-12345678'
});
```

#### `beginTransaction()`
Begin a transaction

```javascript
const transaction = await db.beginTransaction();
```

## Where Clause Syntax

### Basic Comparison

```javascript
// Equals
{ wallet_address: '0x123...' }

// Multiple conditions (AND)
{
  lottery_day: '2025-03-25',
  drawn: false
}

// NULL check
{ prize_amount: null }

// IN clause
{ pool_id: [1, 2, 3] }

// Operators
{
  amount: { operator: '>', value: 1000 }
}
```

### OrderBy Syntax

```javascript
// String format
orderBy: 'created_at DESC'

// Object format
orderBy: { created_at: 'DESC', id: 'ASC' }

// Array format
orderBy: [
  { column: 'lottery_day', direction: 'DESC' },
  { column: 'created_at', direction: 'ASC' }
]
```

## ROFL Storage Notes

### Storage Model

The ROFL adapter uses a key-value storage model:

- **Record Key**: `rofl.{table}:{primary_key}`
- **List Key**: `rofl.{table}:list` (stores IDs of all records)
- **Index Key**: `rofl.{table}:index:{field}:{value}`

### Primary Key Mapping

| Table | Primary Key |
|-------|-------------|
| users | wallet_address |
| invoices | invoice_number |
| pool_invoices | id |
| token_holders | id |

### Performance Considerations

- ROFL uses key-value storage, so query performance differs from PostgreSQL.
- It is recommended to query by primary key for optimal performance.
- Complex queries may require scanning all records.

## Integrating the ROFL SDK

For actual deployment, you need to integrate the real ROFL SDK:

```javascript
import { ROFLClient } from '@oasisprotocol/rofl-sdk';
import { DatabaseFactory } from './db/DatabaseFactory.js';

// Create ROFL client
const roflClient = new ROFLClient({
  endpoint: process.env.ROFL_ENDPOINT,
  nodeId: process.env.ROFL_NODE_ID
});

// Create ROFL database
const db = DatabaseFactory.createDatabase('rofl', {
  client: roflClient
});
```

## Development Guide

### Querying Data

Use the abstracted query methods:

```javascript
// Find one
const user = await db.findOne('users', {
  wallet_address: walletAddress
});

// Find many
const invoices = await db.findMany('invoices', {
  where: { lottery_day: '2025-03-25' },
  orderBy: { created_at: 'DESC' }
});
```

### Using Transactions

```javascript
const transaction = await db.beginTransaction();

try {
  await transaction.insert('invoices', data);
  await transaction.update('users', updateData, whereClause);
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
} finally {
  await transaction.release();
}
```

## Testing

### Unit Test Example

```javascript
import { DatabaseFactory } from './db/DatabaseFactory.js';
import { MockROFLClient } from './db/adapters/ROFLAdapter.js';

// Test using Mock ROFL client
const mockClient = new MockROFLClient();
const db = DatabaseFactory.createDatabase('rofl', {
  client: mockClient
});

// Test insert
const user = await db.insert('users', {
  wallet_address: '0x123...',
  carrier_number: 'TEST123'
});

// Test find
const found = await db.findOne('users', {
  wallet_address: '0x123...'
});

assert.equal(found.carrier_number, 'TEST123');
```

## Troubleshooting

### PostgreSQL Connection Issues

Ensure the environment variables are set correctly:
```bash
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
```

### ROFL Storage Issues

1.  Confirm the ROFL client is initialized correctly.
2.  Check if the primary key settings are correct.
3.  Check the ROFL logs for more information.

## Performance Optimization Suggestions

1.  **Use Primary Key Queries**: Prioritize querying by primary key.
2.  **Batch Operations**: Use batch insert/update to reduce round trips.
3.  **Caching Strategy**: Implement a caching mechanism at the application layer.
4.  **Index Optimization**: Create appropriate indexes in PostgreSQL.

## License

MIT License