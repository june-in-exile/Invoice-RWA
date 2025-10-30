-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT UNIQUE NOT NULL,
  carrier_number TEXT UNIQUE NOT NULL,
  pool_id INTEGER NOT NULL,
  donation_percent INTEGER NOT NULL CHECK (donation_percent IN (20, 50)),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_carrier ON users(carrier_number);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  carrier_number TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  pool_id INTEGER NOT NULL,
  donation_percent INTEGER NOT NULL,
  amount REAL NOT NULL,
  purchase_date TEXT NOT NULL,
  lottery_day TEXT NOT NULL,
  token_type_id INTEGER,
  drawn INTEGER DEFAULT 0,
  prize_amount REAL DEFAULT 0,
  claimed INTEGER DEFAULT 0,
  claimed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (carrier_number) REFERENCES users(carrier_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_carrier ON invoices(carrier_number);
CREATE INDEX IF NOT EXISTS idx_invoices_wallet ON invoices(wallet_address);
CREATE INDEX IF NOT EXISTS idx_invoices_pool ON invoices(pool_id);
CREATE INDEX IF NOT EXISTS idx_invoices_lottery_day ON invoices(lottery_day);
CREATE INDEX IF NOT EXISTS idx_invoices_token_type ON invoices(token_type_id);
CREATE INDEX IF NOT EXISTS idx_invoices_drawn ON invoices(drawn);

-- Pool Invoices Association Table
CREATE TABLE IF NOT EXISTS pool_invoices (
  pool_id INTEGER NOT NULL,
  token_type_id INTEGER NOT NULL,
  invoice_number TEXT NOT NULL,
  lottery_day TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),

  PRIMARY KEY (invoice_number),
  FOREIGN KEY (invoice_number) REFERENCES invoices(invoice_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pool_invoices_lottery ON pool_invoices(pool_id, lottery_day);
CREATE INDEX IF NOT EXISTS idx_pool_token_type ON pool_invoices(pool_id, token_type_id);

-- Token Type Holders (for caching holder information)
CREATE TABLE IF NOT EXISTS token_holders (
  token_type_id INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  balance INTEGER NOT NULL,
  last_updated TEXT DEFAULT (datetime('now')),

  PRIMARY KEY (token_type_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_token_holders_token ON token_holders(token_type_id);
CREATE INDEX IF NOT EXISTS idx_token_holders_wallet ON token_holders(wallet_address);

-- System Logs
CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);

-- Relayer Transactions
CREATE TABLE IF NOT EXISTS relayer_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT UNIQUE NOT NULL,
  tx_type TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT,
  gas_used INTEGER,
  gas_price INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_relayer_tx_hash ON relayer_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_relayer_tx_status ON relayer_transactions(status);
CREATE INDEX IF NOT EXISTS idx_relayer_tx_type ON relayer_transactions(tx_type);
