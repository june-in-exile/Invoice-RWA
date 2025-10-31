# ROFL Deployment Testing Guide

This guide explains how to test your ROFL deployment without using a frontend application.

## Prerequisites

- ROFL deployment is complete and running
- You have the ROFL API endpoint (e.g., `https://p3000.m942.opf-testnet-rofl-25.rofl.app`)
- `oasis` CLI is installed and configured

## 1. Health Check

The quickest way to verify the service is running:

```bash
curl https://p3000.m942.opf-testnet-rofl-25.rofl.app/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 2. API Endpoint Testing

### 2.1 User Registration

Register a test user:

```bash
curl -X POST https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "carrierNumber": "/ABC1234",
    "poolId": 1,
    "donationPercent": 20
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "carrierNumber": "/ABC1234",
    "poolId": 1,
    "donationPercent": 20
  }
}
```

### 2.2 Get User Information

Retrieve user details:

```bash
curl https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/users/0x1234567890123456789012345678901234567890
```

### 2.3 Update User Settings

Update donation percentage:

```bash
curl -X PUT https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/users/0x1234567890123456789012345678901234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 2,
    "donationPercent": 30
  }'
```

### 2.4 Register Invoice

Register a test invoice:

```bash
curl -X POST https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/invoices/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "invoiceNumber": "AB12345678",
    "invoiceDate": "2024-01-15",
    "amount": 1000,
    "randomCode": "1234"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Invoice registered and NFT minted successfully",
  "invoice": {
    "invoiceNumber": "AB12345678",
    "tokenId": 1,
    "txHash": "0x..."
  }
}
```

### 2.5 Get User Invoices

Query all invoices for a user:

```bash
curl https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/invoices/user/0x1234567890123456789012345678901234567890
```

### 2.6 Batch Register Invoices

Register multiple invoices at once:

```bash
curl -X POST https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/invoices/batch-register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "invoices": [
      {
        "invoiceNumber": "AB12345678",
        "invoiceDate": "2024-01-15",
        "amount": 1000,
        "randomCode": "1234"
      },
      {
        "invoiceNumber": "CD87654321",
        "invoiceDate": "2024-01-16",
        "amount": 2000,
        "randomCode": "5678"
      }
    ]
  }'
```

## 3. Application Logs

### 3.1 View Real-time Logs

Monitor logs as they happen:

```bash
oasis rofl machine logs --follow
```

Press `Ctrl+C` to stop following logs.

### 3.2 View Recent Logs

View the last 100 lines:

```bash
oasis rofl machine logs --tail 100
```

View the last 50 lines:

```bash
oasis rofl machine logs --tail 50
```

### 3.3 Filter Logs

Search for specific errors:

```bash
oasis rofl machine logs --tail 200 | grep ERROR
```

Search for API requests:

```bash
oasis rofl machine logs --tail 200 | grep "POST\|GET"
```

## 4. Database Verification

### 4.1 Check Database Tables

List all tables:

```bash
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db ".tables"
```

**Expected Output:**

```
invoices        lottery_results  users
```

### 4.2 Query Users Table

View all registered users:

```bash
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db "SELECT * FROM users;"
```

View specific user:

```bash
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db \
  "SELECT * FROM users WHERE wallet_address = '0x1234567890123456789012345678901234567890';"
```

### 4.3 Query Invoices Table

View all invoices:

```bash
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db "SELECT * FROM invoices;"
```

Count total invoices:

```bash
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db "SELECT COUNT(*) FROM invoices;"
```

View invoices for specific user:

```bash
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db \
  "SELECT * FROM invoices WHERE wallet_address = '0x1234567890123456789012345678901234567890';"
```

### 4.4 Query Lottery Results

View lottery results:

```bash
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db "SELECT * FROM lottery_results;"
```

### 4.5 Database Schema

View table schema:

```bash
# Users table schema
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db ".schema users"

# Invoices table schema
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db ".schema invoices"

# Lottery results table schema
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db ".schema lottery_results"
```

## 5. Machine Status Monitoring

### 5.1 View Machine Details

Get complete machine information:

```bash
oasis rofl machine show
```

This displays:

- Machine ID
- API endpoint
- Status (running, stopped, etc.)
- TEE type (Intel TDX)
- Resources (memory, CPUs, storage)
- Payment expiration date

### 5.2 Check Machine Status Only

```bash
oasis rofl machine show | grep Status
```

### 5.3 Check Payment Expiration

```bash
oasis rofl machine show | grep "Paid until"
```

### 5.4 Check Endpoint

```bash
oasis rofl machine show | grep Endpoint
```

## 6. Using Test Script

You can use the existing `test-api.sh` script with the ROFL endpoint:

### 6.1 Update Script

Edit `test-api.sh` and update the base URL:

```bash
# Change this line
BASE_URL="http://localhost:3000"

# To this
BASE_URL="https://p3000.m942.opf-testnet-rofl-25.rofl.app"
```

### 6.2 Run Tests

```bash
# Run all tests except invoice registration
./test-api.sh --skip-invoice

# Run all tests
./test-api.sh
```

## 7. Troubleshooting

### 7.1 Service Not Responding

If the health check fails:

1. Check machine status:

   ```bash
   oasis rofl machine show
   ```

2. Check application logs for errors:

   ```bash
   oasis rofl machine logs --tail 100
   ```

3. Restart the machine if needed:
   ```bash
   oasis rofl update
   ```

### 7.2 Database Errors

If you see database-related errors:

1. Check if database file exists:

   ```bash
   oasis rofl machine exec -- ls -lh /rofl/storage/invoice_rwa.db
   ```

2. Verify database integrity:
   ```bash
   oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db "PRAGMA integrity_check;"
   ```

### 7.3 Environment Variables

Check if environment variables are set correctly:

```bash
# This will show in the logs during startup
oasis rofl machine logs --tail 200 | grep -i "config\|env"
```

If secrets are missing, set them:

```bash
echo -n "0x..." | oasis rofl secret set RELAYER_PRIVATE_KEY -
echo -n "0x..." | oasis rofl secret set ORACLE_PRIVATE_KEY -
oasis rofl update
```

### 7.4 Network Issues

If you can't connect to the API:

1. Verify the endpoint is correct:

   ```bash
   oasis rofl machine show | grep Endpoint
   ```

2. Check if the machine is in "running" state:

   ```bash
   oasis rofl machine show | grep Status
   ```

3. Test basic connectivity:
   ```bash
   curl -I https://p3000.m942.opf-testnet-rofl-25.rofl.app/health
   ```

## 8. Testing Workflow

Recommended testing sequence:

1. **Health Check** - Verify service is running
2. **View Logs** - Check for startup errors
3. **Register User** - Test user registration endpoint
4. **Query User** - Verify user data is stored
5. **Check Database** - Confirm data persistence
6. **Register Invoice** - Test invoice registration and NFT minting
7. **Query Invoices** - Verify invoice data
8. **Monitor Logs** - Watch for any errors during operations

## 9. Continuous Monitoring

For ongoing monitoring, you can:

1. Set up periodic health checks:

   ```bash
   watch -n 30 curl -s https://p3000.m942.opf-testnet-rofl-25.rofl.app/health
   ```

2. Monitor logs continuously:

   ```bash
   oasis rofl machine logs --follow
   ```

3. Check machine status regularly:
   ```bash
   oasis rofl machine show
   ```

## 10. Performance Testing

For load testing, use tools like `ab` (Apache Bench) or `wrk`:

```bash
# Install Apache Bench (if not already installed)
brew install httpd

# Test health endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 https://p3000.m942.opf-testnet-rofl-25.rofl.app/health

# Test user registration (with POST data)
ab -n 50 -c 5 -p user-data.json -T application/json \
  https://p3000.m942.opf-testnet-rofl-25.rofl.app/api/users/register
```

## Summary

The most common testing workflow is:

```bash
# 1. Quick health check
curl https://p3000.m942.opf-testnet-rofl-25.rofl.app/health

# 2. Check logs for errors
oasis rofl machine logs --tail 50

# 3. Test API endpoints with curl
# (See section 2 for examples)

# 4. Verify data in database
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db "SELECT COUNT(*) FROM users;"

# 5. Monitor machine status
oasis rofl machine show
```

For automated testing, use the `test-api.sh` script with the ROFL endpoint URL.
