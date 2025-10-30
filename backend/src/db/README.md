# Database Abstraction Layer

這個資料庫抽象層提供統一的介面來存取不同的儲存後端，包括 PostgreSQL 和 Oasis ROFL (Runtime Off-Chain Logic)。

## 架構

```
src/db/
├── interfaces/
│   └── IDatabase.js          # 資料庫介面定義
├── adapters/
│   ├── PostgresAdapter.js    # PostgreSQL 實作
│   └── ROFLAdapter.js         # ROFL 儲存實作
├── utils/
│   └── queryBuilder.js       # SQL 查詢建構工具
├── DatabaseFactory.js        # 資料庫工廠
└── db.js                     # 主要匯出檔案
```

## 功能特色

- 🔄 **多重後端支援**: 支援 PostgreSQL 和 ROFL 儲存
- 🎯 **統一介面**: 所有資料庫操作使用相同的 API
- 💾 **交易支援**: 完整的交易管理 (begin, commit, rollback)
- 🔌 **易於擴展**: 可輕鬆新增其他資料庫類型
- ⚡ **向後相容**: 現有程式碼無需大幅修改

## 快速開始

### 1. 設定環境變數

在 `.env` 檔案中設定資料庫類型：

```bash
# 使用 PostgreSQL (預設)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoice_rwa
DB_USER=postgres
DB_PASSWORD=yourpassword

# 或使用 ROFL
DB_TYPE=rofl
ROFL_ENDPOINT=your-rofl-endpoint
ROFL_NODE_ID=your-node-id
```

### 2. 基本使用

```javascript
import db from './db/db.js';

// 查詢單筆資料
const user = await db.findOne('users', {
  wallet_address: '0x123...'
});

// 查詢多筆資料
const invoices = await db.findMany('invoices', {
  where: { lottery_day: '2025-03-25', drawn: false },
  orderBy: { created_at: 'DESC' },
  limit: 10
});

// 插入資料
const newUser = await db.insert('users', {
  wallet_address: '0x123...',
  carrier_number: 'AB12345678',
  pool_id: 1,
  donation_percent: 20
});

// 更新資料
const rowsAffected = await db.update(
  'invoices',
  { drawn: true, prize_amount: 1000 },
  { invoice_number: 'AB-12345678' }
);

// 刪除資料
const deleted = await db.delete('users', {
  wallet_address: '0x123...'
});
```

### 3. 使用交易

```javascript
const transaction = await db.beginTransaction();

try {
  // 插入發票
  await transaction.insert('invoices', {
    invoice_number: 'AB-12345678',
    amount: 1000,
    // ... 其他欄位
  });

  // 更新用戶統計
  await transaction.update(
    'users',
    { total_invoices: { operator: '+', value: 1 } },
    { wallet_address: '0x123...' }
  );

  // 提交交易
  await transaction.commit();
} catch (error) {
  // 發生錯誤時回滾
  await transaction.rollback();
  throw error;
} finally {
  // 釋放資源
  await transaction.release();
}
```

## API 參考

### IDatabase 介面

#### `connect()`
連接資料庫

```javascript
await db.connect();
```

#### `disconnect()`
關閉資料庫連接

```javascript
await db.disconnect();
```

#### `findOne(table, where)`
查詢單筆資料

參數：
- `table`: 表格名稱
- `where`: 查詢條件物件

```javascript
const user = await db.findOne('users', {
  wallet_address: '0x123...'
});
```

#### `findMany(table, options)`
查詢多筆資料

參數：
- `table`: 表格名稱
- `options`: 查詢選項
  - `where`: 查詢條件
  - `orderBy`: 排序條件
  - `limit`: 限制筆數
  - `offset`: 偏移量
  - `select`: 選擇欄位（預設 `*`）

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
插入資料

```javascript
const invoice = await db.insert('invoices', {
  invoice_number: 'AB-12345678',
  amount: 1000,
  lottery_day: '2025-03-25'
});
```

#### `update(table, data, where)`
更新資料

```javascript
const rowsAffected = await db.update(
  'invoices',
  { drawn: true },
  { invoice_number: 'AB-12345678' }
);
```

#### `delete(table, where)`
刪除資料

```javascript
const deleted = await db.delete('invoices', {
  invoice_number: 'AB-12345678'
});
```

#### `beginTransaction()`
開始交易

```javascript
const transaction = await db.beginTransaction();
```

## Where 條件語法

### 基本比較

```javascript
// 等於
{ wallet_address: '0x123...' }

// 多個條件（AND）
{
  lottery_day: '2025-03-25',
  drawn: false
}

// NULL 檢查
{ prize_amount: null }

// IN 子句
{ pool_id: [1, 2, 3] }

// 運算符
{
  amount: { operator: '>', value: 1000 }
}
```

### OrderBy 語法

```javascript
// 字串格式
orderBy: 'created_at DESC'

// 物件格式
orderBy: { created_at: 'DESC', id: 'ASC' }

// 陣列格式
orderBy: [
  { column: 'lottery_day', direction: 'DESC' },
  { column: 'created_at', direction: 'ASC' }
]
```

## ROFL 儲存說明

### 儲存模式

ROFL adapter 使用 key-value 儲存模式：

- **記錄 Key**: `rofl.{table}:{primary_key}`
- **列表 Key**: `rofl.{table}:list` (儲存所有記錄的 ID)
- **索引 Key**: `rofl.{table}:index:{field}:{value}`

### 主鍵對應

| Table | Primary Key |
|-------|-------------|
| users | wallet_address |
| invoices | invoice_number |
| pool_invoices | id |
| token_holders | id |

### 效能考量

- ROFL 使用 key-value 儲存，查詢效能與 PostgreSQL 不同
- 建議使用主鍵查詢以獲得最佳效能
- 複雜查詢可能需要掃描所有記錄

## 整合 ROFL SDK

實際部署時，需要整合真實的 ROFL SDK：

```javascript
import { ROFLClient } from '@oasisprotocol/rofl-sdk';
import { DatabaseFactory } from './db/DatabaseFactory.js';

// 建立 ROFL client
const roflClient = new ROFLClient({
  endpoint: process.env.ROFL_ENDPOINT,
  nodeId: process.env.ROFL_NODE_ID
});

// 建立 ROFL database
const db = DatabaseFactory.createDatabase('rofl', {
  client: roflClient
});
```

## 遷移指南

### 從原本的 pool.query() 遷移

**之前:**
```javascript
const result = await db.query(
  'SELECT * FROM users WHERE wallet_address = $1',
  [walletAddress]
);
const user = result.rows[0];
```

**之後:**
```javascript
const user = await db.findOne('users', {
  wallet_address: walletAddress
});
```

### 從交易遷移

**之前:**
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...', []);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
} finally {
  client.release();
}
```

**之後:**
```javascript
const transaction = await db.beginTransaction();
try {
  await transaction.insert('table', data);
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
} finally {
  await transaction.release();
}
```

## 測試

### 單元測試範例

```javascript
import { DatabaseFactory } from './db/DatabaseFactory.js';
import { MockROFLClient } from './db/adapters/ROFLAdapter.js';

// 使用 Mock ROFL client 進行測試
const mockClient = new MockROFLClient();
const db = DatabaseFactory.createDatabase('rofl', {
  client: mockClient
});

// 測試插入
const user = await db.insert('users', {
  wallet_address: '0x123...',
  carrier_number: 'TEST123'
});

// 測試查詢
const found = await db.findOne('users', {
  wallet_address: '0x123...'
});

assert.equal(found.carrier_number, 'TEST123');
```

## 故障排除

### PostgreSQL 連接問題

確認環境變數設定正確：
```bash
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
```

### ROFL 儲存問題

1. 確認 ROFL client 已正確初始化
2. 檢查主鍵設定是否正確
3. 查看 ROFL 日誌以獲取更多資訊

## 效能優化建議

1. **使用主鍵查詢**: 優先使用主鍵進行查詢
2. **批次操作**: 批量插入/更新以減少往返次數
3. **快取策略**: 在應用層實作快取機制
4. **索引優化**: PostgreSQL 可建立適當的索引

## 授權

MIT License
