#!/bin/bash

# =============================================================================
# Invoice-RWA Backend API Testing Script
# =============================================================================
#
# Usage:
#   ./test-api.sh                    # Run all tests
#   ./test-api.sh --skip-invoice     # Skip invoice registration (no blockchain)
#   ./test-api.sh --verbose          # Show detailed output
#
# =============================================================================

set -e  # Exit on error

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
SKIP_INVOICE=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-invoice)
      SKIP_INVOICE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-invoice    Skip invoice registration tests (no blockchain interaction)"
      echo "  --verbose         Show detailed output"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
TOTAL_TESTS=0

# Generate unique test data
TIMESTAMP=$(date +%s)
WALLET_ADDRESS="0xabcd000000000000000000000000000000${TIMESTAMP: -6}"
CARRIER_NUMBER="/TEST${TIMESTAMP: -4}"
INVOICE_NUMBER="AB-${TIMESTAMP: -8}"
LOTTERY_DAY="2025-11-25"

# Helper functions
print_header() {
  echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_test() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${BLUE}Test $TOTAL_TESTS:${NC} $1"
}

print_success() {
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

print_failure() {
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo -e "${RED}✗ FAIL${NC}: $1"
}

print_skip() {
  TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
  echo -e "${YELLOW}⊘ SKIP${NC}: $1"
}

print_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is not installed${NC}"
  echo "Please install jq: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

# Test execution function
run_test() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="${5:-200}"

  print_test "$test_name"

  if [ "$VERBOSE" = true ]; then
    echo "  Method: $method"
    echo "  Endpoint: $endpoint"
    if [ -n "$data" ]; then
      echo "  Data: $data"
    fi
  fi

  # Make request
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$data")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "${BASE_URL}${endpoint}")
  fi

  # Extract status code and body
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  # Check status code
  if [ "$http_code" -eq "$expected_status" ]; then
    print_success "$test_name (HTTP $http_code)"
    if [ "$VERBOSE" = true ] || [ -n "$body" ]; then
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo "$body"
    return 0
  else
    print_failure "$test_name (Expected: $expected_status, Got: $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 1
  fi
}

# =============================================================================
# Start Testing
# =============================================================================

print_header "Invoice-RWA Backend API Testing"

print_info "Test Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Test Wallet: $WALLET_ADDRESS"
echo "  Test Carrier: $CARRIER_NUMBER"
echo "  Test Invoice: $INVOICE_NUMBER"
echo "  Lottery Day: $LOTTERY_DAY"
echo "  Skip Invoice Tests: $SKIP_INVOICE"
echo ""

# =============================================================================
# Test 1: Health Check
# =============================================================================

health_response=$(run_test "Health Check" "GET" "/health" "" 200)
if echo "$health_response" | grep -q "\"status\".*\"ok\""; then
  print_success "Backend is healthy"
else
  print_failure "Backend health check failed"
  exit 1
fi

echo ""

# =============================================================================
# Test 2: User Registration
# =============================================================================

user_data="{
  \"walletAddress\": \"$WALLET_ADDRESS\",
  \"carrierNumber\": \"$CARRIER_NUMBER\",
  \"poolId\": 1,
  \"donationPercent\": 20
}"

register_response=$(run_test "Register User" "POST" "/api/users/register" "$user_data" 200)
if echo "$register_response" | grep -q "\"success\".*true"; then
  print_success "User registered successfully"
else
  print_failure "User registration failed"
fi

echo ""

# =============================================================================
# Test 3: Get User Info
# =============================================================================

user_response=$(run_test "Get User Info" "GET" "/api/users/$WALLET_ADDRESS" "" 200)
if echo "$user_response" | grep -q "\"wallet_address\".*\"$WALLET_ADDRESS\""; then
  print_success "User info retrieved successfully"

  # Verify data
  if echo "$user_response" | grep -q "\"donation_percent\".*20"; then
    print_success "User data is correct (donation_percent: 20)"
  else
    print_failure "User data verification failed"
  fi
else
  print_failure "Failed to retrieve user info"
fi

echo ""

# =============================================================================
# Test 4: Update User Settings
# =============================================================================

update_data='{
  "poolId": 2,
  "donationPercent": 50
}'

update_response=$(run_test "Update User Settings" "PUT" "/api/users/$WALLET_ADDRESS" "$update_data" 200)
if echo "$update_response" | grep -q "\"success\".*true"; then
  print_success "User settings updated successfully"
else
  print_failure "User settings update failed"
fi

echo ""

# =============================================================================
# Test 5: Verify Update
# =============================================================================

verify_response=$(run_test "Verify User Update" "GET" "/api/users/$WALLET_ADDRESS" "" 200)
if echo "$verify_response" | grep -q "\"donation_percent\".*50"; then
  print_success "User update verified (donation_percent: 50)"
else
  print_failure "User update verification failed"
fi

echo ""

# =============================================================================
# Test 6: Duplicate User Registration (Should Fail)
# =============================================================================

print_test "Test Duplicate User Registration (Expected to fail)"
duplicate_response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/users/register" \
  -H "Content-Type: application/json" \
  -d "$user_data")

duplicate_code=$(echo "$duplicate_response" | tail -n1)
if [ "$duplicate_code" -eq 409 ]; then
  print_success "Duplicate registration correctly rejected (HTTP 409)"
else
  print_failure "Duplicate registration should return 409, got $duplicate_code"
fi

echo ""

# =============================================================================
# Test 7: Get Non-existent User (Should Return 404)
# =============================================================================

print_test "Test Get Non-existent User (Expected to fail)"
nonexist_response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/users/0x0000000000000000000000000000000000000000")

nonexist_code=$(echo "$nonexist_response" | tail -n1)
if [ "$nonexist_code" -eq 404 ]; then
  print_success "Non-existent user correctly returns 404"
else
  print_failure "Non-existent user should return 404, got $nonexist_code"
fi

echo ""

# =============================================================================
# Test 8: Pool Management - Invalid Request (Missing Fields)
# =============================================================================

print_test "Test Pool API - Missing Fields (Expected to fail)"
invalid_pool_data='{
  "minDonationPercent": 30
}'

invalid_pool_response=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/api/pools/1/min-donation-percent" \
  -H "Content-Type: application/json" \
  -d "$invalid_pool_data")

invalid_pool_code=$(echo "$invalid_pool_response" | tail -n1)
if [ "$invalid_pool_code" -eq 400 ]; then
  print_success "Missing signature field correctly rejected (HTTP 400)"
else
  print_failure "Missing fields should return 400, got $invalid_pool_code"
fi

echo ""

# =============================================================================
# Test 9: Pool Management - Invalid Signature
# =============================================================================

print_test "Test Pool API - Invalid Signature (Expected to fail)"
invalid_sig_data='{
  "minDonationPercent": 30,
  "signature": "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
}'

invalid_sig_response=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/api/pools/1/min-donation-percent" \
  -H "Content-Type: application/json" \
  -d "$invalid_sig_data")

invalid_sig_code=$(echo "$invalid_sig_response" | tail -n1)
if [ "$invalid_sig_code" -eq 403 ] || [ "$invalid_sig_code" -eq 500 ]; then
  print_success "Invalid signature correctly rejected (HTTP $invalid_sig_code)"
else
  print_warning "Invalid signature returned HTTP $invalid_sig_code (expected 403 or 500)"
fi

echo ""

# =============================================================================
# Test 10: Pool Management - Invalid Percentage Range
# =============================================================================

print_test "Test Pool API - Invalid Percentage (Expected to fail)"
invalid_percent_data='{
  "minDonationPercent": 150,
  "signature": "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
}'

invalid_percent_response=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/api/pools/1/min-donation-percent" \
  -H "Content-Type: application/json" \
  -d "$invalid_percent_data")

invalid_percent_code=$(echo "$invalid_percent_response" | tail -n1)
if [ "$invalid_percent_code" -eq 400 ]; then
  print_success "Invalid percentage range correctly rejected (HTTP 400)"
else
  print_failure "Invalid percentage should return 400, got $invalid_percent_code"
fi

echo ""

# =============================================================================
# Test 11: Get User Invoices (Should be empty)
# =============================================================================

invoices_response=$(run_test "Get User Invoices (Empty)" "GET" "/api/invoices/user/$WALLET_ADDRESS" "" 200)
if echo "$invoices_response" | grep -q "\"data\".*\[\]"; then
  print_success "User invoices list is empty as expected"
else
  print_warning "User invoices list is not empty (may have data from previous tests)"
fi

echo ""

# =============================================================================
# Test 12: Invoice Registration (Optional - requires blockchain)
# =============================================================================

if [ "$SKIP_INVOICE" = false ]; then
  print_warning "Invoice registration will interact with blockchain"
  print_info "This test may fail if:"
  print_info "  - Smart contracts are not deployed"
  print_info "  - Relayer wallet has insufficient gas"
  print_info "  - RPC endpoint is not accessible"
  print_info "Use --skip-invoice flag to skip this test"
  echo ""

  invoice_data="{
    \"invoiceNumber\": \"$INVOICE_NUMBER\",
    \"carrierNumber\": \"$CARRIER_NUMBER\",
    \"amount\": 1500,
    \"purchaseDate\": \"2025-10-29\",
    \"lotteryDay\": \"$LOTTERY_DAY\"
  }"

  invoice_response=$(run_test "Register Invoice" "POST" "/api/invoices/register" "$invoice_data" 200 || true)
  if echo "$invoice_response" | grep -q "\"success\".*true"; then
    print_success "Invoice registered and NFT minted successfully"

    # Extract token ID
    token_id=$(echo "$invoice_response" | jq -r '.data.tokenTypeId' 2>/dev/null || echo "")
    if [ -n "$token_id" ] && [ "$token_id" != "null" ]; then
      print_info "Token Type ID: $token_id"
    fi
  else
    print_warning "Invoice registration failed (blockchain interaction required)"
  fi

  echo ""

  # =============================================================================
  # Test 13: Get User Invoices After Registration
  # =============================================================================

  if echo "$invoice_response" | grep -q "\"success\".*true"; then
    invoices_after=$(run_test "Get User Invoices (After Registration)" "GET" "/api/invoices/user/$WALLET_ADDRESS" "" 200)
    # Extract only the last line (JSON response) for parsing
    invoice_json=$(echo "$invoices_after" | tail -n1)
    invoice_count=$(echo "$invoice_json" | jq '.data | length' 2>/dev/null || echo "0")

    if [ "$invoice_count" -gt 0 ]; then
      print_success "User now has $invoice_count invoice(s)"
    else
      print_failure "User invoices not found after registration"
    fi
    echo ""
  fi

  # =============================================================================
  # Test 14: Get Invoices by Lottery Day
  # =============================================================================

  lottery_response=$(run_test "Get Invoices by Lottery Day" "GET" "/api/invoices/lottery/$LOTTERY_DAY" "" 200)
  echo ""

else
  print_skip "Invoice registration tests (--skip-invoice flag set)"
  TOTAL_TESTS=$((TOTAL_TESTS + 3))
  TESTS_SKIPPED=$((TESTS_SKIPPED + 3))
  echo ""
fi

# =============================================================================
# Test Summary
# =============================================================================

print_header "Test Summary"

echo -e "${CYAN}Total Tests:${NC}   $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC}        $TESTS_PASSED"
echo -e "${RED}Failed:${NC}        $TESTS_FAILED"
echo -e "${YELLOW}Skipped:${NC}       $TESTS_SKIPPED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
