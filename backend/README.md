# Invoice-RWA Backend

Backend service for Invoice RWA (Real World Asset) platform that tokenizes physical invoices and automates lottery prize distribution.

## Core Features

### 1. User Management

- Register users (bind wallet, carrier number, select pool and donation percentage)
- Query and update user settings

### 2. Invoice Management

- Register invoices and auto-mint NFTs (ERC-1155)
- Batch invoice processing
- Query user invoices and lottery results

### 3. Relayer Service

- Gasless NFT minting for users
- Monitor relayer wallet balance

### 4. Oracle Service

- Fetch lottery results from government API
- Notify smart contracts with winning information
- Scheduled task: Process lottery results daily at 2 AM

### 5. Prize Distribution

- Listen to `LotteryResultNotified` events on-chain
- Auto-calculate and batch distribute rewards (push mode)

## Tech Stack

- Express.js - Web framework
- SQLite - Database (for ROFL TEE deployment)
- ethers.js v6 - Blockchain interaction
- Winston - Logging
- node-cron - Task scheduling

## Deployment Options

### Option 1: Local Development

**Fastest way to develop and test**

```bash
# 1. Install dependencies
npm install

# 2. Initialize database
npm run db:init

# 3. Start development server
npm run dev

# 4. Test APIs
./test-api.sh --skip-invoice
```

### Option 2: Docker Compose (Local Container)

**Test the exact container that will run in ROFL**

```bash
# Build and test
./test-docker.sh

# Test APIs
./test-api.sh --skip-invoice

# Stop when done
docker compose down
```

See [DOCKER_COMPOSE_GUIDE.md](./DOCKER_COMPOSE_GUIDE.md) for details.

### Option 3: ROFL Deployment (Production)

**Deploy to ROFL network in TEE**

```bash
# 1. Push image to public registry
docker push your-username/invoice-rwa-backend:latest

# 2. Initialize ROFL
oasis rofl init

# 3. Register app on-chain
oasis rofl create --network testnet

# 4. Set secrets
oasis rofl secret set RELAYER_PRIVATE_KEY 0x...
oasis rofl secret set ORACLE_PRIVATE_KEY 0x...

# 5. Build and deploy
oasis rofl build
oasis rofl deploy
```

See [ROFL_DEPLOYMENT.md](./ROFL_DEPLOYMENT.md) for details.

## API Endpoints

### Health Check

- `GET /health` - System health status

### User Management

- `POST /api/users/register` - Register user
- `GET /api/users/:walletAddress` - Get user info
- `PUT /api/users/:walletAddress` - Update user settings

### Invoice Management

- `POST /api/invoices/register` - Register single invoice
- `POST /api/invoices/batch-register` - Batch register invoices
- `GET /api/invoices/user/:walletAddress` - Get user invoices
- `GET /api/invoices/lottery/:lotteryDay` - Get invoices by lottery date
- `GET /api/lottery-results?lottery_date=YYYY-MM-DD` - Query lottery results (internal API)

## Interacting with ROFL Deployment

After deploying to ROFL, your backend is accessible via HTTPS:

### Get Your API Endpoint

```bash
# View machine information
oasis rofl machine show
```

Your API will be available at:
```
https://p3000.m<machine-id>.<region>.rofl.app
```

### API Usage

Replace `localhost:3000` with your ROFL endpoint:

```bash
# Health check
curl https://p3000.m942.opf-testnet-rofl-25.rofl.app/health

# Register user
curl -X POST https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x...", "carrierNumber": "12345678", "poolId": 1, "donationPercent": 20}'

# Get invoice count
curl https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/invoices/count/0x...
```

### View Logs

```bash
# Real-time logs
oasis rofl machine logs --follow
```

### Manage Secrets

```bash
# Update environment variables
oasis rofl secret set RELAYER_PRIVATE_KEY 0x...
oasis rofl secret set ORACLE_PRIVATE_KEY 0x...

# Apply changes
oasis rofl update
```

### Database Operations

```bash
# View tables
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db ".tables"

# Check database size
oasis rofl machine exec -- ls -lh /rofl/storage/invoice_rwa.db

# Backup database
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db .dump > backup.sql

# Restore database
cat backup.sql | oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db
```

### Monitor Machine Status

```bash
# Show machine details (endpoint, status, resources)
oasis rofl machine show

# Check when payment expires
oasis rofl machine show | grep "Paid until"
```

## Frontend Integration

Update your frontend to use the ROFL endpoint:

```javascript
// In your frontend config
const API_BASE_URL = 'https://p3000.m942.opf-testnet-rofl-25.rofl.app';

// All API calls now go through ROFL
const response = await fetch(`${API_BASE_URL}/api/users/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress, carrierNumber, poolId, donationPercent })
});
```

## Scheduled Tasks

- **Hourly**: Check relayer balance
- **Daily at 2 AM**: Process previous day's lottery results

## Documentation

- [QUICK_START.md](./QUICK_START.md) - Quick start guide for all deployment options
- [ROFL_DEPLOYMENT.md](./ROFL_DEPLOYMENT.md) - Detailed ROFL deployment guide
- [DOCKER_COMPOSE_GUIDE.md](./DOCKER_COMPOSE_GUIDE.md) - Docker Compose usage guide
