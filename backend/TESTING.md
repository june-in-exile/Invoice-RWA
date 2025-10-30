# Invoice RWA Backend - 測試文檔

本文檔說明如何測試 Invoice RWA 後端系統，包括資料庫抽象層的測試。

## 目錄

- [環境設定](#環境設定)
- [PostgreSQL 模式測試](#postgresql-模式測試)
- [ROFL 模式測試](#rofl-模式測試)
- [API 測試](#api-測試)
- [整合測試](#整合測試)
- [常見問題](#常見問題)

---

## 環境設定

### 前置需求

- Node.js >= 18
- PostgreSQL >= 14 (如使用 PostgreSQL 模式)
- Docker (可選，用於快速啟動 PostgreSQL)

### 安裝依賴

```bash
cd backend
npm install
```

### 環境變數設定

複製環境變數範例檔案：

```bash
cp .env.example .env
```

編輯 `.env` 設定所需的環境變數。

---

## PostgreSQL 模式測試

### 1. 啟動 PostgreSQL

#### 使用 Docker (推薦)

```bash
docker run --name invoice-rwa-postgres \
  -e POSTGRES_PASSWORD=testpassword \
  -e POSTGRES_DB=invoice_rwa \
  -p 5432:5432 \
  -d postgres:14
```

#### 或使用本機 PostgreSQL

確保 PostgreSQL 服務正在運行，並創建資料庫：

```bash
createdb invoice_rwa
```

### 2. 設定環境變數

在 `.env` 中設定：

```bash
# 資料庫類型
DB_TYPE=postgres

# PostgreSQL 連接設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoice_rwa
DB_USER=postgres
DB_PASSWORD=testpassword
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# 區塊鏈設定（Zircuit Testnet）
ZIRCUIT_TESTNET_RPC_URL=https://zircuit1-testnet.p2pify.com
CHAIN_ID=48899

# 已部署的合約地址（Zircuit Testnet）
INVOICE_TOKEN_ADDRESS=0x0b627dC0ddeD44149b9e5Fb78C43E693de7CB717
POOL_ADDRESS=0x187a5B23B5552fEFA81D1AFe68626A84694F3510

# Relayer 和 Oracle 私鑰（需要有測試網 ETH）
RELAYER_PRIVATE_KEY=0x... # 你的 Relayer 私鑰
ORACLE_PRIVATE_KEY=0x...  # 你的 Oracle 私鑰
```

### 3. 準備 Relayer 錢包 (重要！)

後端需要 Relayer 錢包來 mint NFT，請確保：

1. **生成或匯入錢包**

   ```bash
   # 使用 cast 生成新錢包（記下私鑰和地址）
   cast wallet new

   # 或使用現有私鑰
   cast wallet address --private-key $YOUR_PRIVATE_KEY
   ```

2. **領取測試網 ETH**

   - 訪問 Zircuit Testnet Faucet
   - 輸入 Relayer 錢包地址
   - 領取至少 0.1 ETH

3. **驗證餘額**

   ```bash
   cast balance $RELAYER_ADDRESS --rpc-url $ZIRCUIT_TESTNET_RPC_URL
   ```

4. **更新 .env**
   ```bash
   RELAYER_PRIVATE_KEY=0x你的私鑰
   RELAYER_ADDRESS=0x你的地址
   ```

### 4. 初始化資料庫 Schema

```bash
npm run db:init
```

預期輸出：

```
[INFO] Starting database initialization...
[INFO] Database initialized successfully
[INFO] Tables created from schema.sql
```

### 5. 啟動後端服務

```bash
npm run dev
```

預期輸出：

```
[INFO] ROFL backend started on port 3000
[INFO] Environment: development
[INFO] Relayer address: 0x... (你的 Relayer 地址)
[INFO] Oracle address: 0x... (你的 Oracle 地址)
```

**如果看到錯誤：** 檢查 `.env` 中的私鑰是否正確設定。

### 6. 驗證資料庫連接

測試健康檢查端點：

```bash
curl http://localhost:3000/health
```

預期回應：

```json
{
  "status": "ok",
  "timestamp": "2025-10-30T12:34:56.789Z"
}
```

### 7. 測試用戶註冊 (PostgreSQL)

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

預期回應：

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

### 8. 測試用戶查詢

```bash
curl http://localhost:3000/api/users/0x1234567890123456789012345678901234567890
```

預期回應：

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

### 9. 測試發票註冊 (包含 NFT Mint)

**注意：** 這個步驟會在區塊鏈上 mint NFT，需要：

- Relayer 錢包有足夠的 ETH
- 合約地址正確
- RPC 連接正常

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

成功回應：

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

**可以在區塊瀏覽器查看交易：**
https://explorer.testnet.zircuit.com/tx/[txHash]

### 10. 驗證 PostgreSQL 資料

連接到 PostgreSQL 並檢查資料：

```bash
docker exec -it invoice-rwa-postgres psql -U postgres -d invoice_rwa
```

在 psql 中執行：

```sql
-- 查看所有表格
\dt

-- 查看用戶資料
SELECT * FROM users;

-- 查看發票資料
SELECT * FROM invoices;

-- 退出
\q
```

---

## ROFL 模式測試

ROFL 模式使用 Mock client 進行測試，不需要真實的 ROFL 節點。

### 1. 設定環境變數

在 `.env` 中設定：

```bash
# 資料庫類型
DB_TYPE=rofl

# ROFL 設定（使用 Mock client 時可以留空）
# ROFL_ENDPOINT=
# ROFL_NODE_ID=

# 其他設定與 PostgreSQL 模式相同
ZIRCUIT_RPC_URL=https://zircuit1-testnet.p2pify.com
CHAIN_ID=48899
INVOICE_TOKEN_ADDRESS=0x...
POOL_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...
ORACLE_PRIVATE_KEY=0x...
```

### 2. 啟動後端服務

```bash
npm run dev
```

**注意：** ROFL 模式不需要執行 `npm run db:init`，因為 ROFL 使用 key-value 儲存，不需要 SQL schema。

### 3. 測試用戶註冊 (ROFL)

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

### 4. 測試用戶查詢 (ROFL)

```bash
curl http://localhost:3000/api/users/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
```

### 5. 驗證 ROFL 儲存

由於使用 Mock client，資料存在記憶體中。可以透過 API 查詢驗證。

查看所有用戶的發票：

```bash
curl http://localhost:3000/api/invoices/user/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
```

---

## API 測試

### 用戶管理 API

#### 1. 註冊用戶

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

#### 2. 查詢用戶

```bash
curl http://localhost:3000/api/users/0x1111111111111111111111111111111111111111
```

#### 3. 更新用戶設定

```bash
curl -X PUT http://localhost:3000/api/users/0x1111111111111111111111111111111111111111 \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 2,
    "donationPercent": 50
  }'
```

### 發票管理 API

#### 1. 註冊發票

**注意：** 此操作會觸發鏈上 mint NFT，需要設定正確的合約地址和 Relayer 私鑰。

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

#### 2. 批量註冊發票

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

#### 3. 查詢用戶發票

```bash
curl http://localhost:3000/api/invoices/user/0x1111111111111111111111111111111111111111
```

#### 4. 查詢特定開獎日的發票

```bash
curl http://localhost:3000/api/invoices/lottery/2025-11-25
```

---

## 整合測試

### 完整流程測試腳本

創建測試腳本 `test-flow.sh`：

```bash
#!/bin/bash

set -e

BASE_URL="http://localhost:3000"
WALLET_ADDRESS="0x2222222222222222222222222222222222222222"
CARRIER_NUMBER="TEST123456"

echo "=== Invoice RWA Backend Integration Test ==="
echo ""

# 1. 健康檢查
echo "1. Testing health check..."
curl -s $BASE_URL/health | jq .
echo ""

# 2. 註冊用戶
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

# 3. 查詢用戶
echo "3. Fetching user..."
curl -s $BASE_URL/api/users/$WALLET_ADDRESS | jq .
echo ""

# 4. 更新用戶
echo "4. Updating user..."
curl -s -X PUT $BASE_URL/api/users/$WALLET_ADDRESS \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 2,
    "donationPercent": 50
  }' | jq .
echo ""

# 5. 驗證更新
echo "5. Verifying update..."
curl -s $BASE_URL/api/users/$WALLET_ADDRESS | jq .
echo ""

# 6. 查詢用戶發票（應該是空的）
echo "6. Fetching user invoices..."
curl -s $BASE_URL/api/invoices/user/$WALLET_ADDRESS | jq .
echo ""

echo "=== Test completed successfully! ==="
```

執行測試：

```bash
chmod +x test-flow.sh
./test-flow.sh
```

### 效能測試

使用 `ab` (Apache Bench) 進行簡單的效能測試：

```bash
# 測試健康檢查端點
ab -n 1000 -c 10 http://localhost:3000/health

# 測試用戶查詢端點
ab -n 100 -c 5 http://localhost:3000/api/users/0x1111111111111111111111111111111111111111
```

### 使用 k6 進行負載測試

創建 `load-test.js`：

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
};

export default function () {
  // 健康檢查
  const healthRes = http.get("http://localhost:3000/health");
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200,
  });

  // 查詢用戶
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

執行負載測試：

```bash
k6 run load-test.js
```

---

## 資料庫抽象層測試

### 單元測試範例

創建 `test-db-abstraction.js`：

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

  // 測試 insert
  const user = await db.insert("users", {
    wallet_address: "0xtest123",
    carrier_number: "TEST001",
    pool_id: 1,
    donation_percent: 20,
  });
  console.log("✓ Insert successful:", user);

  // 測試 findOne
  const found = await db.findOne("users", {
    wallet_address: "0xtest123",
  });
  console.log("✓ FindOne successful:", found);

  // 測試 update
  const updated = await db.update(
    "users",
    { donation_percent: 50 },
    { wallet_address: "0xtest123" }
  );
  console.log("✓ Update successful, rows affected:", updated);

  // 測試 findMany
  const users = await db.findMany("users", {
    where: { pool_id: 1 },
  });
  console.log("✓ FindMany successful, found:", users.length);

  // 清理測試資料
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

  // 測試 insert
  const user = await db.insert("users", {
    wallet_address: "0xrofl123",
    carrier_number: "ROFL001",
    pool_id: 2,
    donation_percent: 50,
  });
  console.log("✓ Insert successful:", user);

  // 測試 findOne
  const found = await db.findOne("users", {
    wallet_address: "0xrofl123",
  });
  console.log("✓ FindOne successful:", found);

  // 測試 update
  const updated = await db.update(
    "users",
    { donation_percent: 20 },
    { wallet_address: "0xrofl123" }
  );
  console.log("✓ Update successful, rows affected:", updated);

  // 測試 findMany
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

執行測試：

```bash
node test-db-abstraction.js
```

---

## 常見問題

### PostgreSQL 模式

#### Q: 資料庫連接失敗

**錯誤訊息：**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解決方案：**

1. 確認 PostgreSQL 服務正在運行
2. 檢查 `.env` 中的資料庫設定
3. 確認防火牆設定

#### Q: Schema 初始化失敗

**錯誤訊息：**

```
Error: relation "users" already exists
```

**解決方案：**
刪除現有資料庫並重新初始化：

```bash
docker exec -it invoice-rwa-postgres psql -U postgres -c "DROP DATABASE invoice_rwa;"
docker exec -it invoice-rwa-postgres psql -U postgres -c "CREATE DATABASE invoice_rwa;"
npm run db:init
```

### ROFL 模式

#### Q: ROFL 模式啟動失敗

**錯誤訊息：**

```
Error: ROFL adapter does not support raw SQL queries
```

**解決方案：**
確保程式碼使用抽象化的 API（`findOne`, `insert` 等），而非原始 SQL 查詢。

#### Q: 資料不持久化

**說明：**
ROFL Mock client 將資料存在記憶體中，重啟後會遺失。

**解決方案：**

- 開發環境：這是預期行為
- 生產環境：整合真實的 Oasis ROFL SDK

### API 測試

#### Q: 發票註冊失敗

**錯誤訊息：**

```
Error: Carrier not registered
```

**解決方案：**
在註冊發票前，先註冊對應的用戶（carrier_number）。

#### Q: NFT mint 失敗

**錯誤訊息：**

```
Error: insufficient funds for gas
```

**解決方案：**

1. 確認 Relayer 錢包有足夠的測試幣
2. 從 Zircuit testnet faucet 領取測試幣
3. 檢查 `RELAYER_PRIVATE_KEY` 設定是否正確
