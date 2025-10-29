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

## Environment Setup

Copy `.env.example` to `.env` and configure.

## Installation & Running

```bash
# Install dependencies
npm install

# Initialize database
npm run db:init

# Development mode
npm run dev

# Production mode
npm start
```

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

## Scheduled Tasks

- **Hourly**: Check relayer balance
- **Daily at 2 AM**: Process previous day's lottery results

## Tech Stack

- Express.js - Web framework
- PostgreSQL - Database
- ethers.js v6 - Blockchain interaction
- Winston - Logging
- node-cron - Task scheduling
