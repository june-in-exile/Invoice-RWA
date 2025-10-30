-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  carrier_number VARCHAR(20) UNIQUE NOT NULL,
  pool_id INT NOT NULL,
  donation_percent INT NOT NULL CHECK (donation_percent IN (20, 50)),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_carrier ON users(carrier_number);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(20) UNIQUE NOT NULL,
  carrier_number VARCHAR(20) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  pool_id INT NOT NULL,
  donation_percent INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  lottery_day DATE NOT NULL,
  token_type_id BIGINT,
  drawn BOOLEAN DEFAULT FALSE,
  prize_amount DECIMAL(20, 18) DEFAULT 0,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (carrier_number) REFERENCES users(carrier_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_carrier ON invoices(carrier_number);
CREATE INDEX IF NOT EXISTS idx_invoices_wallet ON invoices(wallet_address);
CREATE INDEX IF NOT EXISTS idx_invoices_pool ON invoices(pool_id);
CREATE INDEX IF NOT EXISTS idx_invoices_lottery_day ON invoices(lottery_day);
CREATE INDEX IF NOT EXISTS idx_invoices_token_type ON invoices(token_type_id);
CREATE INDEX IF NOT EXISTS idx_invoices_drawn ON invoices(drawn);

-- Pool Invoices Association Table
-- Note: The primary key is changed to invoice_number because the same token_type_id may correspond to multiple invoices
CREATE TABLE IF NOT EXISTS pool_invoices (
  pool_id INT NOT NULL,
  token_type_id BIGINT NOT NULL,
  invoice_number VARCHAR(20) NOT NULL,
  lottery_day DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (invoice_number),
  FOREIGN KEY (invoice_number) REFERENCES invoices(invoice_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pool_invoices_lottery ON pool_invoices(pool_id, lottery_day);
CREATE INDEX IF NOT EXISTS idx_pool_token_type ON pool_invoices(pool_id, token_type_id);

-- Token Type Holders (for caching holder information)
CREATE TABLE IF NOT EXISTS token_holders (
  token_type_id BIGINT NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  balance BIGINT NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (token_type_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_token_holders_token ON token_holders(token_type_id);
CREATE INDEX IF NOT EXISTS idx_token_holders_wallet ON token_holders(wallet_address);

-- System Logs
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);

-- Relayer Transactions
CREATE TABLE IF NOT EXISTS relayer_transactions (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  tx_type VARCHAR(50) NOT NULL, -- 'mint', 'claim', 'notify'
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42),
  gas_used BIGINT,
  gas_price BIGINT,
  status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'failed'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relayer_tx_hash ON relayer_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_relayer_tx_status ON relayer_transactions(status);
CREATE INDEX IF NOT EXISTS idx_relayer_tx_type ON relayer_transactions(tx_type);
