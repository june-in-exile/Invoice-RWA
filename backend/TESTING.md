# Invoice RWA Backend - Testing Documentation

This document explains how to test the Invoice RWA backend system, including tests for the database abstraction layer.

## Table of Contents

- [Environment Setup](#environment-setup)
- [PostgreSQL Mode Testing](#postgresql-mode-testing)
- [ROFL Mode Testing](#rofl-mode-testing)
- [API Testing](#api-testing)
- [Integration Testing](#integration-testing)
- [Frequently Asked Questions](#frequently-asked-questions)

---

## Environment Setup

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14 (if using PostgreSQL mode)
- Docker (optional, for quickly starting PostgreSQL)

### Install Dependencies

```bash
cd backend
npm install
```

### Environment Variable Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to configure the required environment variables.

---

## PostgreSQL Mode Testing

### 1. Start PostgreSQL

#### Using Docker (Recommended)

```bash
docker run --name invoice-rwa-postgres \
  -e POSTGRES_PASSWORD=testpassword \
  -e POSTGRES_DB=invoice_rwa \
  -p 5432:5432 \
  -d postgres:14
```

#### Or use local PostgreSQL

Ensure the PostgreSQL service is running and create the database:

```bash
createdb invoice_rwa
```

### 2. Configure Environment Variables

Set the following in `.env`:

```bash
# Database type
DB_TYPE=postgres

# PostgreSQL connection settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoice_rwa
DB_USER=postgres
DB_PASSWORD=testpassword
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Blockchain settings (Zircuit Testnet)
ZIRCUIT_TESTNET_RPC_URL=https://zircuit1-testnet.p2pify.com
CHAIN_ID=48899

# Deployed contract addresses (Zircuit Testnet)
INVOICE_TOKEN_ADDRESS=0x0b627dC0ddeD44149b9e5Fb78C43E693de7CB717
POOL_ADDRESS=0x187a5B23B5552fEFA81D1AFe68626A84694F3510

# Relayer and Oracle private keys (require testnet ETH)
RELAYER_PRIVATE_KEY=0x... # Your Relayer private key
ORACLE_PRIVATE_KEY=0x...  # Your Oracle private key
```

### 3. Prepare Relayer Wallet (Important!)

The backend needs a Relayer wallet to mint NFTs. Please ensure:

1.  **Generate or Import a Wallet**

    ```bash
    # Use cast to generate a new wallet (note down the private key and address)
    cast wallet new

    # Or use an existing private key
    cast wallet address --private-key $YOUR_PRIVATE_KEY
    ```

2.  **Get Testnet ETH**

    - Visit the Zircuit Testnet Faucet
    - Enter the Relayer wallet address
    - Claim at least 0.1 ETH

3.  **Verify Balance**

    ```bash
    cast balance $RELAYER_ADDRESS --rpc-url $ZIRCUIT_TESTNET_RPC_URL
    ```

4.  **Update .env**
    ```bash
    RELAYER_PRIVATE_KEY=0xyour_private_key
    RELAYER_ADDRESS=0xyour_address
    ```

### 4. Initialize Database Schema

```bash
npm run db:init
```

Expected output:

```
[INFO] Starting database initialization...
[INFO] Database initialized successfully
[INFO] Tables created from schema.sql
```

### 5. Start the Backend Service

```bash
npm run dev
```

Expected output:

```
[INFO] ROFL backend started on port 3000
[INFO] Environment: development
[INFO] Relayer address: 0x... (Your Relayer address)
[INFO] Oracle address: 0x... (Your Oracle address)
```

**If you see an error:** Check if the private keys in `.env` are set correctly.

### 6. Verify Database Connection

Test the health check endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-10-30T12:34:56.789Z"
}
```

### 7. Test User Registration (PostgreSQL)

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "carrierNumber": "AB12345678",
    "poolId": 1,
    "donationPercent": 20
  }'
```

Expected response:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "carrierNumber": "AB12345678",
    "poolId": 1,
    "donationPercent": 20
  }
}
```

### 8. Test User Query

```bash
curl http://localhost:3000/api/users/0x1234567890123456789012345678901234567890
```

Expected response:

```json
{
  "success": true,
  "data": {
    "wallet_address": "0x1234567890123456789012345678901234567890",
    "carrier_number": "AB12345678",
    "pool_id": 1,
    "donation_percent": 20,
    "created_at": "2025-10-30T12:34:56.789Z",
    "updated_at": "2025-10-30T12:34:56.789Z"
  }
}
```

### 9. Test Invoice Registration (Includes NFT Mint)

**Note:** This step will mint an NFT on the blockchain and requires:

- The Relayer wallet to have enough ETH
- Correct contract addresses
- A working RPC connection

```bash
curl -X POST http://localhost:3000/api/invoices/register \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "AB-99999999",
    "carrierNumber": "AB12345678",
    "amount": 1500,
    "purchaseDate": "2025-10-30",
    "lotteryDay": "2025-11-25"
  }'
```

Successful response:

```json
{
  "success": true,
  "message": "Invoice registered successfully",
  "data": {
    "invoiceNumber": "AB-99999999",
    "tokenTypeId": "1",
    "txHash": "0x...",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }
}
```

**You can view the transaction on the block explorer:**
https://explorer.testnet.zircuit.com/tx/[txHash]

### 10. Verify PostgreSQL Data

Connect to PostgreSQL and check the data:

```bash
docker exec -it invoice-rwa-postgres psql -U postgres -d invoice_rwa
```

In psql, execute:

```sql
-- View all tables
\dt

-- View user data
SELECT * FROM users;

-- View invoice data
SELECT * FROM invoices;

-- Exit
\q
```

---

## ROFL Mode Testing

ROFL mode uses a Mock client for testing and does not require a real ROFL node.

### 1. Configure Environment Variables

Set the following in `.env`:

```bash
# Database type
DB_TYPE=rofl

# ROFL settings (can be left empty when using the Mock client)
# ROFL_ENDPOINT=
# ROFL_NODE_ID=

# Other settings are the same as in PostgreSQL mode
ZIRCUIT_RPC_URL=https://zircuit1-testnet.p2pify.com
CHAIN_ID=48899
INVOICE_TOKEN_ADDRESS=0x...
POOL_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...
ORACLE_PRIVATE_KEY=0x...
```

### 2. Start the Backend Service

```bash
npm run dev
```

**Note:** ROFL mode does not require running `npm run db:init` because ROFL uses key-value storage and does not need an SQL schema.

### 3. Test User Registration (ROFL)

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "carrierNumber": "CD87654321",
    "poolId": 2,
    "donationPercent": 50
  }'
```

### 4. Test User Query (ROFL)

```bash
curl http://localhost:3000/api/users/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
```

### 5. Verify ROFL Storage

Since a Mock client is used, the data is stored in memory. Verification can be done by querying the API.

View all invoices for a user:

```bash
curl http://localhost:3000/api/invoices/user/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
```

---

## API Testing

### User Management API

#### 1. Register User

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1111111111111111111111111111111111111111",
    "carrierNumber": "EF11111111",
    "poolId": 1,
    "donationPercent": 20
  }'
```

#### 2. Query User

```bash
curl http://localhost:3000/api/users/0x1111111111111111111111111111111111111111
```

#### 3. Update User Settings

```bash
curl -X PUT http://localhost:3000/api/users/0x1111111111111111111111111111111111111111 \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 2,
    "donationPercent": 50
  }'
```

### Invoice Management API

#### 1. Register Invoice

**Note:** This action triggers an on-chain NFT mint and requires correct contract addresses and Relayer private key.

```bash
curl -X POST http://localhost:3000/api/invoices/register \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "AB-12345678",
    "carrierNumber": "EF11111111",
    "amount": 1000,
    "purchaseDate": "2025-10-30",
    "lotteryDay": "2025-11-25"
  }'
```

#### 2. Batch Register Invoices

```bash
curl -X POST http://localhost:3000/api/invoices/batch-register \
  -H "Content-Type: application/json" \
  -d '{
    "invoices": [
      {
        "invoiceNumber": "AB-11111111",
        "carrierNumber": "EF11111111",
        "amount": 500,
        "purchaseDate": "2025-10-30",
        "lotteryDay": "2025-11-25"
      },
      {
        "invoiceNumber": "AB-22222222",
        "carrierNumber": "EF11111111",
        "amount": 800,
        "purchaseDate": "2025-10-30",
        "lotteryDay": "2025-11-25"
      }
    ]
  }'
```

#### 3. Query User Invoices

```bash
curl http://localhost:3000/api/invoices/user/0x1111111111111111111111111111111111111111
```

#### 4. Query Invoices by Lottery Day

```bash
curl http://localhost:3000/api/invoices/lottery/2025-11-25
```

---

## Integration Testing

### Full Flow Test Script

Create a test script `test-flow.sh`:

```bash
#!/bin/bash

set -e

BASE_URL="http://localhost:3000"
WALLET_ADDRESS="0x2222222222222222222222222222222222222222"
CARRIER_NUMBER="TEST123456"

echo "=== Invoice RWA Backend Integration Test ==="
echo ""

# 1. Health Check
echo "1. Testing health check..."
curl -s $BASE_URL/health | jq .
echo ""

# 2. Register User
echo "2. Registering user..."
curl -s -X POST $BASE_URL/api/users/register \
  -H "Content-Type: application/json" \
  -d "{
    \"walletAddress\": \"$WALLET_ADDRESS\",
    \"carrierNumber\": \"$CARRIER_NUMBER\",
    \"poolId\": 1,
    \"donationPercent\": 20
  }" | jq .
echo ""

# 3. Fetch User
echo "3. Fetching user..."
curl -s $BASE_URL/api/users/$WALLET_ADDRESS | jq .
echo ""

# 4. Update User
echo "4. Updating user..."
curl -s -X PUT $BASE_URL/api/users/$WALLET_ADDRESS \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 2,
    "donationPercent": 50
  }' | jq .
echo ""

# 5. Verify Update
echo "5. Verifying update..."
curl -s $BASE_URL/api/users/$WALLET_ADDRESS | jq .
echo ""

# 6. Fetch User Invoices (should be empty)
echo "6. Fetching user invoices..."
curl -s $BASE_URL/api/invoices/user/$WALLET_ADDRESS | jq .
echo ""

echo "=== Test completed successfully! ==="
```

Execute the test:

```bash
chmod +x test-flow.sh
./test-flow.sh
```

### Performance Testing

Use `ab` (Apache Bench) for simple performance testing:

```bash
# Test health check endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# Test user query endpoint
ab -n 100 -c 5 http://localhost:3000/api/users/0x1111111111111111111111111111111111111111
```

### Load Testing with k6

Create `load-test.js`:

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
};

export default function () {
  // Health check
  const healthRes = http.get("http://localhost:3000/health");
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200,
  });

  // Query user
  const userRes = http.get(
    "http://localhost:3000/api/users/0x1111111111111111111111111111111111111111"
  );
  check(userRes, {
    "user query status is 200 or 404": (r) =>
      r.status === 200 || r.status === 404,
  });

  sleep(1);
}
```

Run the load test:

```bash
k6 run load-test.js
```

---

## Database Abstraction Layer Testing

### Unit Test Example

Create `test-db-abstraction.js`:

```javascript
import { DatabaseFactory } from "./src/db/DatabaseFactory.js";
import { MockROFLClient } from "./src/db/adapters/ROFLAdapter.js";

async function testPostgreSQLAdapter() {
  console.log("Testing PostgreSQL Adapter...");

  const db = DatabaseFactory.createDatabase("postgres", {
    host: "localhost",
    port: 5432,
    database: "invoice_rwa_test",
    user: "postgres",
    password: "testpassword",
  });

  await db.connect();

  // Test insert
  const user = await db.insert("users", {
    wallet_address: "0xtest123",
    carrier_number: "TEST001",
    pool_id: 1,
    donation_percent: 20,
  });
  console.log("✓ Insert successful:", user);

  // Test findOne
  const found = await db.findOne("users", {
    wallet_address: "0xtest123",
  });
  console.log("✓ FindOne successful:", found);

  // Test update
  const updated = await db.update(
    "users",
    { donation_percent: 50 },
    { wallet_address: "0xtest123" }
  );
  console.log("✓ Update successful, rows affected:", updated);

  // Test findMany
  const users = await db.findMany("users", {
    where: { pool_id: 1 },
  });
  console.log("✓ FindMany successful, found:", users.length);

  // Clean up test data
  await db.delete("users", { wallet_address: "0xtest123" });
  console.log("✓ Delete successful");

  await db.disconnect();
  console.log("PostgreSQL Adapter tests passed!\n");
}

async function testROFLAdapter() {
  console.log("Testing ROFL Adapter...");

  const mockClient = new MockROFLClient();
  const db = DatabaseFactory.createDatabase("rofl", {
    client: mockClient,
  });

  await db.connect();

  // Test insert
  const user = await db.insert("users", {
    wallet_address: "0xrofl123",
    carrier_number: "ROFL001",
    pool_id: 2,
    donation_percent: 50,
  });
  console.log("✓ Insert successful:", user);

  // Test findOne
  const found = await db.findOne("users", {
    wallet_address: "0xrofl123",
  });
  console.log("✓ FindOne successful:", found);

  // Test update
  const updated = await db.update(
    "users",
    { donation_percent: 20 },
    { wallet_address: "0xrofl123" }
  );
  console.log("✓ Update successful, rows affected:", updated);

  // Test findMany
  const users = await db.findMany("users", {
    where: { pool_id: 2 },
  });
  console.log("✓ FindMany successful, found:", users.length);

  await db.disconnect();
  console.log("ROFL Adapter tests passed!\n");
}

async function runTests() {
  try {
    await testPostgreSQLAdapter();
    await testROFLAdapter();
    console.log("All tests passed! ✓");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

runTests();
```

---

## Frequently Asked Questions

### PostgreSQL Mode

#### Q: Database connection failed

**Error message:**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

1.  Confirm the PostgreSQL service is running.
2.  Check the database settings in `.env`.
3.  Check firewall settings.

#### Q: Schema initialization failed

**Error message:**

```
Error: relation "users" already exists
```

**Solution:**
Drop the existing database and re-initialize it:

```bash
docker exec -it invoice-rwa-postgres psql -U postgres -c "DROP DATABASE invoice_rwa;"
docker exec -it invoice-rwa-postgres psql -U postgres -c "CREATE DATABASE invoice_rwa;"
npm run db:init
```

### ROFL Mode

#### Q: ROFL mode failed to start

**Error message:**

```
Error: ROFL adapter does not support raw SQL queries
```

**Solution:**
Ensure the code uses the abstracted API (`findOne`, `insert`, etc.) instead of raw SQL queries.

#### Q: Data is not persistent

**Explanation:**
The ROFL Mock client stores data in memory, which is lost on restart.

**Solution:**

-   Development environment: This is the expected behavior.
-   Production environment: Integrate the real Oasis ROFL SDK.

### API Testing

#### Q: Invoice registration failed

**Error message:**

```
Error: Carrier not registered
```

**Solution:**
Register the corresponding user (carrier_number) before registering an invoice.

#### Q: NFT mint failed

**Error message:**

```
Error: insufficient funds for gas
```

**Solution:**

1.  Ensure the Relayer wallet has enough testnet currency.
2.  Get testnet currency from the Zircuit testnet faucet.
3.  Check if the `RELAYER_PRIVATE_KEY` is set correctly.