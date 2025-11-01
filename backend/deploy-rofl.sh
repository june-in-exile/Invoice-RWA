#!/bin/bash

# =============================================================================
# Invoice-RWA Backend ROFL Deployment Script
# =============================================================================
#
# This script automates the complete ROFL deployment process:
# 1. Build ROFL container
# 2. Configure all secrets
# 3. Deploy to ROFL
# 4. Show deployment info
#
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
  echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
  print_error ".env file not found!"
  exit 1
fi

# Load environment variables
export $(cat .env | sed 's/#.*//g' | xargs)

print_header "Invoice-RWA Backend ROFL Deployment"

# =============================================================================
# Step 1: Build ROFL Container
# =============================================================================

print_header "Step 1: Building ROFL Container"
print_info "This will build the container image for TEE deployment..."

docker run --platform linux/amd64 --volume .:/src ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build --force

print_success "ROFL container built successfully"

# =============================================================================
# Step 2: Configure Secrets
# =============================================================================

print_header "Step 2: Configuring ROFL Secrets"

# V2 Contract Addresses
print_info "Setting contract addresses..."
echo -n "$INVOICE_TOKEN_V2_ADDRESS" | oasis rofl secret set INVOICE_TOKEN_V2_ADDRESS - --force
echo -n "$POOL_V2_ADDRESS" | oasis rofl secret set POOL_V2_ADDRESS - --force
print_success "Contract addresses configured"

# Admin Credentials
print_info "Setting admin credentials..."
echo -n "$ADMIN_PRIVATE_KEY" | oasis rofl secret set ADMIN_PRIVATE_KEY - --force
print_success "Admin credentials configured"

# Relayer Credentials
print_info "Setting relayer credentials..."
echo -n "$RELAYER_PRIVATE_KEY" | oasis rofl secret set RELAYER_PRIVATE_KEY - --force
echo -n "$RELAYER_ADDRESS" | oasis rofl secret set RELAYER_ADDRESS - --force
print_success "Relayer credentials configured"

# Oracle Credentials
print_info "Setting oracle credentials..."
echo -n "$ORACLE_PRIVATE_KEY" | oasis rofl secret set ORACLE_PRIVATE_KEY - --force
echo -n "$ORACLE_ADDRESS" | oasis rofl secret set ORACLE_ADDRESS - --force
print_success "Oracle credentials configured"

# Beneficiary Address
print_info "Setting beneficiary address..."
echo -n "$BENEFICIARY_ADDRESS" | oasis rofl secret set BENEFICIARY_ADDRESS - --force
echo -n "$BENEFICIARY_PRIVATE_KEY" | oasis rofl secret set BENEFICIARY_PRIVATE_KEY - --force
print_success "Beneficiary configured"

# Chain Configuration
print_info "Setting chain configuration..."
echo -n "$CHAIN_ID" | oasis rofl secret set CHAIN_ID - --force
echo -n "$ZIRCUIT_TESTNET_RPC_URL" | oasis rofl secret set ZIRCUIT_RPC_URL - --force
print_success "Chain configuration set"

print_success "All secrets configured successfully"

# =============================================================================
# Step 3: Deploy to ROFL
# =============================================================================

print_header "Step 3: Deploying to ROFL"
print_info "Deploying application to ROFL machine..."

oasis rofl deploy

print_success "ROFL deployment initiated"

# =============================================================================
# Step 4: Show Deployment Info
# =============================================================================

print_header "Step 4: Deployment Information"
print_info "Fetching deployment details..."

echo ""
oasis rofl show

print_header "Deployment Complete!"
print_info "Getting machine endpoint..."

echo ""
oasis rofl machine show

print_success "Deployment completed successfully!"
echo ""
print_info "Your API endpoint will be available at:"
print_info "  https://p3000.m<machine-id>.<region>.rofl.app"
echo ""
print_info "Wait 5-10 minutes for SSL certificate provisioning, then test with:"
print_info "  ./test-rofl-api.sh"
echo ""
