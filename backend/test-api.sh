#!/bin/bash

# API Testing Script for Invoice-RWA Backend
# Usage: ./test-api.sh

BASE_URL="http://localhost:3000"

# Generate unique test data
TIMESTAMP=$(date +%s)
WALLET_ADDRESS="0xabcd000000000000000000000000000000${TIMESTAMP: -6}"
CARRIER_NUMBER="/TEST${TIMESTAMP: -4}"
INVOICE_NUMBER="AB-${TIMESTAMP: -8}"

echo "===== Invoice-RWA API Testing ====="
echo "Test Wallet: $WALLET_ADDRESS"
echo "Test Carrier: $CARRIER_NUMBER"
echo "Test Invoice: $INVOICE_NUMBER"
echo ""

# 1. Health Check
echo "1. Testing Health Check..."
curl -s -X GET "${BASE_URL}/health" | jq
echo -e "\n"

# 2. Register User
echo "2. Testing User Registration..."
curl -s -X POST "${BASE_URL}/api/users/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"walletAddress\": \"$WALLET_ADDRESS\",
    \"carrierNumber\": \"$CARRIER_NUMBER\",
    \"poolId\": 1,
    \"donationPercent\": 20
  }" | jq
echo -e "\n"

# 3. Get User Info
echo "3. Testing Get User Info..."
curl -s -X GET "${BASE_URL}/api/users/${WALLET_ADDRESS}" | jq
echo -e "\n"

# 4. Update User Settings
echo "4. Testing Update User Settings..."
curl -s -X PUT "${BASE_URL}/api/users/${WALLET_ADDRESS}" \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 2,
    "donationPercent": 50
  }' | jq
echo -e "\n"

# 5. Register Invoice (This will call smart contract - may fail without proper RPC)
echo "5. Testing Invoice Registration..."
echo "Note: This will attempt to mint NFT on-chain and may fail without proper RPC/gas configuration"
curl -s -X POST "${BASE_URL}/api/invoices/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"invoiceNumber\": \"$INVOICE_NUMBER\",
    \"carrierNumber\": \"$CARRIER_NUMBER\",
    \"amount\": 1500,
    \"purchaseDate\": \"2025-10-29\",
    \"lotteryDay\": \"2025-11-25\"
  }" | jq
echo -e "\n"

# 6. Get User Invoices
echo "6. Testing Get User Invoices..."
curl -s -X GET "${BASE_URL}/api/invoices/user/${WALLET_ADDRESS}" | jq
echo -e "\n"

# 7. Get Invoices by Lottery Day
echo "7. Testing Get Invoices by Lottery Day..."
curl -s -X GET "${BASE_URL}/api/invoices/lottery/2025-11-25" | jq
echo -e "\n"

echo "===== Testing Complete ====="
echo "Summary:"
echo "  - Test wallet: $WALLET_ADDRESS"
echo "  - Test carrier: $CARRIER_NUMBER"
echo "  - Test invoice: $INVOICE_NUMBER"
