# API Testing Guide

## Quick Start

### Method 1: Using the Test Script (Recommended)

```bash
# Run the automated test script
./test-api.sh
```

### Method 2: Using curl Commands

#### 1. Health Check

```bash
curl http://localhost:3000/health
```

#### 2. Register User

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "carrierNumber": "/ABC1234",
    "poolId": 1,
    "donationPercent": 20
  }'
```

#### 3. Get User Info

```bash
curl http://localhost:3000/api/users/0x1234567890123456789012345678901234567890
```

#### 4. Update User Settings

```bash
curl -X PUT http://localhost:3000/api/users/0x1234567890123456789012345678901234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 2,
    "donationPercent": 50
  }'
```

#### 5. Register Invoice (Mints NFT)

```bash
curl -X POST http://localhost:3000/api/invoices/register \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "AB-12345678",
    "carrierNumber": "/ABC1234",
    "amount": 1500,
    "purchaseDate": "2025-10-29",
    "lotteryDay": "2025-11-25"
  }'
```

**Note:** This endpoint will mint an NFT on-chain. Ensure:

- User with carrierNumber is already registered
- Relayer has enough gas
- RPC connection is working

#### 6. Get User Invoices

```bash
curl http://localhost:3000/api/invoices/user/0x1234567890123456789012345678901234567890
```

#### 7. Get Invoices by Lottery Day

```bash
curl http://localhost:3000/api/invoices/lottery/2025-11-25
```

#### 8. Batch Register Invoices

```bash
curl -X POST http://localhost:3000/api/invoices/batch-register \
  -H "Content-Type: application/json" \
  -d '{
    "invoices": [
      {
        "invoiceNumber": "AB-11111111",
        "carrierNumber": "/ABC1234",
        "amount": 500,
        "purchaseDate": "2025-10-29",
        "lotteryDay": "2025-11-25"
      },
      {
        "invoiceNumber": "AB-22222222",
        "carrierNumber": "/ABC1234",
        "amount": 1000,
        "purchaseDate": "2025-10-29",
        "lotteryDay": "2025-11-25"
      }
    ]
  }'
```

### Method 3: Using Postman/Insomnia

1. Import the following collection settings:

   - Base URL: `http://localhost:3000`
   - Content-Type: `application/json`

2. Create requests for each endpoint listed above

### Method 4: Using HTTPie (if installed)

```bash
# Install httpie
brew install httpie

# Health check
http GET localhost:3000/health

# Register user
http POST localhost:3000/api/users/register \
  walletAddress="0x1234567890123456789012345678901234567890" \
  carrierNumber="/ABC1234" \
  poolId:=1 \
  donationPercent:=20
```

## Testing Workflow

### Complete Test Flow

1. **Start the server**

   ```bash
   npm run dev
   ```

2. **Register a user first** (required before registering invoices)

   ```bash
   curl -X POST http://localhost:3000/api/users/register \
     -H "Content-Type: application/json" \
     -d '{
       "walletAddress": "0xYourWalletAddress",
       "carrierNumber": "/YourCarrier",
       "poolId": 1,
       "donationPercent": 20
     }'
   ```

3. **Register an invoice** (this will mint NFT to the user)

   ```bash
   curl -X POST http://localhost:3000/api/invoices/register \
     -H "Content-Type: application/json" \
     -d '{
       "invoiceNumber": "AB-12345678",
       "carrierNumber": "/YourCarrier",
       "amount": 1500,
       "purchaseDate": "2025-10-29",
       "lotteryDay": "2025-11-25"
     }'
   ```

4. **Check user invoices**
   ```bash
   curl http://localhost:3000/api/invoices/user/0xYourWalletAddress
   ```

## Common Issues

### Issue: User not found when registering invoice

**Solution:** Make sure to register the user first using `/api/users/register`

### Issue: RPC errors when minting NFT

**Solution:** Check your `.env` file:

- Ensure `RELAYER_PRIVATE_KEY` is correct
- Ensure `INVOICE_TOKEN_ADDRESS` is deployed
- Ensure relayer wallet has enough gas
- Check RPC URL is working

### Issue: Database connection error

**Solution:** Ensure PostgreSQL is running:

```bash
brew services start postgresql@14
```

## Tips

- Use `jq` for pretty JSON output: `curl ... | jq`
- Install jq: `brew install jq`
- Check server logs in terminal for detailed error messages
- Test with the health check endpoint first to ensure server is running
