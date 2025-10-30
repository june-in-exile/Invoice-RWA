# ROFL Deployment Guide

This guide explains how to deploy the Invoice RWA backend to ROFL (Runtime Off-Chain Logic).

## Architecture Overview

The backend now uses **SQLite** as the database, which runs inside the ROFL container with persistent storage. This eliminates the need for external database infrastructure while maintaining data persistence.

### Key Components

- **Database**: SQLite (stored in `/rofl/storage/invoice_rwa.db`)
- **Storage**: ROFL persistent storage (10GB allocated)
- **Runtime**: Node.js 18 Alpine
- **Container**: Docker-based deployment

## Prerequisites

### 1. Install Oasis CLI

Download and install the Oasis CLI from the [latest release](https://github.com/oasisprotocol/cli/releases):

```bash
# Download for your platform (example for macOS)
curl -LO https://github.com/oasisprotocol/cli/releases/latest/download/oasis-cli-darwin-amd64
chmod +x oasis-cli-darwin-amd64
sudo mv oasis-cli-darwin-amd64 /usr/local/bin/oasis

# Verify installation
oasis --version
```

### 2. Get Testnet Tokens

You'll need approximately **150 TEST tokens** for:

- App registration
- Machine rental
- Gas fees

Get testnet tokens from the [Oasis faucet](https://faucet.testnet.oasis.io/).

### 3. Create or Import Wallet

```bash
# Create a new wallet
oasis wallet create

# Or import an existing wallet
oasis wallet import --private-key YOUR_PRIVATE_KEY
```

## Deployment Steps

### Step 1: Build and Push Docker Image

```bash
# Build the Docker image
docker build -t your-username/invoice-rwa-backend:latest .

# Test the image locally (optional)
docker run -p 3000:3000 \
  -e RELAYER_PRIVATE_KEY=0x... \
  -e ORACLE_PRIVATE_KEY=0x... \
  your-username/invoice-rwa-backend:latest

# Push to Docker Hub
docker login
docker push your-username/invoice-rwa-backend:latest
```

Or push to GitHub Container Registry:

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Tag and push
docker tag your-username/invoice-rwa-backend:latest ghcr.io/your-username/invoice-rwa-backend:latest
docker push ghcr.io/your-username/invoice-rwa-backend:latest
```

### Step 2: Update ROFL Manifest

Edit `rofl.yaml` and update the container image URL:

```yaml
container:
  image: docker.io/your-username/invoice-rwa-backend:latest
  # Or for GitHub Container Registry:
  # image: ghcr.io/your-username/invoice-rwa-backend:latest
```

### Step 3: Initialize ROFL App

```bash
# Initialize (creates/updates rofl.yaml)
oasis rofl init

# Review and adjust resources if needed
# Edit rofl.yaml to change memory, CPU, or storage
```

### Step 4: Register App On-Chain

```bash
# For testnet
oasis rofl create --network testnet

# For mainnet (when ready)
oasis rofl create --network mainnet
```

This command will:

- Register your app on the blockchain
- Return an app ID (save this!)
- Deduct registration fees from your wallet

### Step 5: Set Environment Secrets

Store sensitive environment variables on-chain (encrypted):

```bash
# Set blockchain configuration
oasis rofl secret set ZIRCUIT_RPC_URL https://zircuit-garfield.liquify.com
oasis rofl secret set CHAIN_ID 48899

# Set contract addresses
oasis rofl secret set INVOICE_TOKEN_ADDRESS 0x0b627dC0ddeD44149b9e5Fb78C43E693de7CB717
oasis rofl secret set POOL_ADDRESS 0x187a5B23B5552fEFA81D1AFe68626A84694F3510

# Set private keys (CRITICAL - keep secure!)
oasis rofl secret set RELAYER_PRIVATE_KEY 0x...
oasis rofl secret set ORACLE_PRIVATE_KEY 0x...
oasis rofl secret set RELAYER_ADDRESS 0x...
oasis rofl secret set ORACLE_ADDRESS 0x...

# Set API keys
oasis rofl secret set GOV_INVOICE_API_URL https://api.einvoice.nat.gov.tw
oasis rofl secret set GOV_API_KEY your_api_key

# Optional: monitoring
oasis rofl secret set ALERT_WEBHOOK_URL https://hooks.slack.com/...
oasis rofl secret set MIN_RELAYER_BALANCE 0.01

# Enable/disable event listener
oasis rofl secret set ENABLE_EVENT_LISTENER false

# Submit all secrets to blockchain
oasis rofl update
```

### Step 6: Build ROFL Bundle

Build the `.orc` bundle (must be done on Linux or via Docker):

```bash
# On Linux
oasis rofl build

# Or using Docker (on macOS/Windows)
docker run --rm -v $(pwd):/workspace \
  ghcr.io/oasisprotocol/rofl-dev:latest \
  oasis rofl build
```

This creates a compressed bundle with your container and execution metadata.

### Step 7: Deploy to ROFL

```bash
# Deploy your app
oasis rofl deploy --network testnet

# This will:
# - Upload your .orc bundle
# - Allocate a machine
# - Start your container
```

### Step 8: Monitor Deployment

```bash
# Check machine status
oasis rofl machine show

# View logs
oasis rofl machine logs

# Follow logs in real-time
oasis rofl machine logs --follow

# Check if app is healthy
curl https://your-rofl-app-url/health
```

## Managing Your ROFL App

### View App Information

```bash
# List all your ROFL apps
oasis rofl list

# Show details of a specific app
oasis rofl show
```

### Update Your App

When you make code changes:

```bash
# 1. Build and push new Docker image
docker build -t your-username/invoice-rwa-backend:v2 .
docker push your-username/invoice-rwa-backend:v2

# 2. Update rofl.yaml with new image tag
# Edit: container.image: docker.io/your-username/invoice-rwa-backend:v2

# 3. Rebuild and redeploy
oasis rofl build
oasis rofl update
oasis rofl deploy
```

### Update Secrets

```bash
# Update a specific secret
oasis rofl secret set RELAYER_PRIVATE_KEY 0xNEW_KEY

# Submit changes
oasis rofl update

# Restart the app to apply changes
oasis rofl machine restart
```

### Stop or Remove App

```bash
# Stop the machine
oasis rofl machine stop

# Remove the app (this will delete all data!)
oasis rofl remove
```

## Monitoring and Debugging

### Check Application Health

```bash
# Health check endpoint
curl https://your-rofl-app-url/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### View Application Logs

```bash
# View recent logs
oasis rofl machine logs

# Follow logs in real-time
oasis rofl machine logs --follow

# Filter logs by level (if using structured logging)
oasis rofl machine logs | grep ERROR
```

### Common Issues

#### 1. Database Initialization Fails

Check logs for database errors:

```bash
oasis rofl machine logs | grep -A 10 "database"
```

If needed, you can manually initialize by restarting the container.

#### 2. Container Fails to Start

Check if image is accessible:

```bash
docker pull your-username/invoice-rwa-backend:latest
```

Verify rofl.yaml has correct image URL.

#### 3. Out of Memory

If app crashes due to memory:

```yaml
# Increase memory in rofl.yaml
resources:
  memory: 4096 # Increase from 2048 to 4096 MB
```

Then rebuild and redeploy.

#### 4. Storage Full

If database grows too large:

```yaml
# Increase storage in rofl.yaml
resources:
  storage: 20480 # Increase from 10240 to 20480 MB
```

Then update and redeploy.

## Database Backup

The SQLite database is stored in ROFL persistent storage. To backup:

```bash
# Access the ROFL machine (if CLI supports it)
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db .dump > backup.sql

# Or implement a backup endpoint in your app
curl https://your-rofl-app-url/admin/backup > backup.sql
```

## Cost Estimation

ROFL deployment costs (approximate):

- **Registration**: ~10 tokens (one-time)
- **Machine rental**: ~1-2 tokens/day (depends on resources)
- **Gas fees**: ~0.1 tokens/day (depends on activity)

**Total**: ~50-70 tokens/month for continuous operation

## Security Best Practices

1. **Private Keys**: Never commit private keys to git. Always use `oasis rofl secret set`.

2. **Network Access**: The app has outbound network access. Ensure your blockchain RPC endpoints are trusted.

3. **Monitoring**: Set up alerts for:

   - App health checks
   - Relayer balance
   - Database size

4. **Updates**: Regularly update dependencies and rebuild images for security patches.

## Support

- **ROFL Documentation**: https://docs.oasis.io/build/rofl/
- **Oasis Discord**: https://oasis.io/discord
- **GitHub Issues**: https://github.com/oasisprotocol/oasis-sdk/issues

## Next Steps

After successful deployment:

1. Test all API endpoints
2. Monitor logs for any errors
3. Set up monitoring/alerting
4. Test the full invoice flow
5. Consider deploying to mainnet

For mainnet deployment, replace `--network testnet` with `--network mainnet` in all commands.
